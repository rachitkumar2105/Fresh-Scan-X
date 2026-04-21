import os
import cv2
import numpy as np
import tensorflow as tf
from PIL import Image
import base64
from groq import Groq
from dotenv import load_dotenv
from .preprocessing import preprocess_image, extract_patches

# Explicitly load .env from the root directory
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

class FruitInference:
    def __init__(self, model_path, confidence_threshold=0.5):
        print(f"Initializing FruitInference with model: {model_path}")
        self.model = tf.keras.models.load_model(model_path)
        self.confidence_threshold = confidence_threshold
        
        # Configure Groq
        api_key = os.getenv("GROQ_API_KEY")
        print(f"GROQ_API_KEY loaded: {'Yes (ends with ' + api_key[-4:] + ')' if api_key else 'No'}")
        if api_key:
            self.groq_client = Groq(api_key=api_key)
        else:
            self.groq_client = None

    def update_llm_config(self, api_key):
        if api_key:
            print("Updating Groq API key from user input.")
            self.groq_client = Groq(api_key=api_key)

    def validate_image(self, image_np):
        h, w = image_np.shape[:2]
        if h < 200 or w < 200:
            return False, "⚠️ Resolution too low. Please use a clearer image."

        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        brightness = np.mean(gray)
        
        if blur_score < 60:
            return False, "⚠️ Image too blurry. Please hold steady."
        if brightness < 40:
            return False, "⚠️ Image too dark. Please improve lighting."
        if brightness > 235:
            return False, "⚠️ Too much glare. Please adjust the angle."
            
        return True, "Valid"

    def predict_image(self, image: Image.Image):
        image_np = np.array(image.convert('RGB'))
        is_valid, validation_msg = self.validate_image(image_np)
        if not is_valid:
            return [{"error": validation_msg, "status": "invalid_input"}]

        img_array = preprocess_image(image)
        prediction = self.model.predict(img_array)[0][0]
        
        rotten_prob = float(prediction)
        fresh_prob = 1.0 - rotten_prob
        confidence = max(rotten_prob, fresh_prob)
        freshness = "Fresh" if rotten_prob < 0.5 else "Rotten"
        
        status = "Safe"
        if 0.4 <= rotten_prob <= 0.6:
            status = "Not Sure"
        elif freshness == "Rotten":
            status = "Unsafe"
        elif freshness == "Fresh" and confidence < 0.7:
            status = "Caution"

        result = {
            "fruit": "Fruit Item",
            "freshness": freshness,
            "confidence": confidence * 100,
            "status": status,
            "consumption_window": "Consume within 3-5 days" if freshness == "Fresh" else "Dispose immediately",
            "risk_level": "High" if freshness == "Rotten" else ("Medium" if status == "Caution" else "Low"),
            "message": f"Detected {freshness} item ({int(confidence*100)}% confidence)",
            "raw_score": rotten_prob
        }
        return [result]

    async def get_intelligent_analysis(self, image_bytes, fruit_hint=None, custom_prompt=None):
        print(f"AI Analysis Requested. Prompt: {custom_prompt}, Hint: {fruit_hint}")
        
        if not self.groq_client:
            print("Error: Groq client not initialized (API key missing).")
            return "Please configure GROQ_API_KEY for advanced analysis."

        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        system_rules = """
        You are the FreshScanX AI Assistant. 
        TASK: Analyze food freshness or answer user questions about food safety.
        
        GUARDRAILS:
        - You ONLY answer questions related to food freshness, safety, recipes, and precautions for the item mentioned.
        - If the user asks something UNRELATED (e.g., general knowledge, time, cooking unrelated things like tea/biryani, or random chat), you MUST reply EXACTLY with:
          "I am only built for suggestions, help, and queries related to food analysis and safety precautions. I cannot answer unrelated questions."
        - If the question is RELATED, provide a professional and concise answer.
        """

        is_placeholder_image = len(base64_image) < 200
        user_query = custom_prompt if custom_prompt else f"Analyze this image of {fruit_hint or 'food'}."
        
        try:
            if is_placeholder_image:
                print("Using text-only model for placeholder image.")
                chat_completion = self.groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_rules},
                        {"role": "user", "content": f"Scanned {fruit_hint or 'item'} was detected as {fruit_hint or 'unknown'}. User Question: {user_query}"}
                    ],
                    model="llama-3.3-70b-versatile",
                )
            else:
                print("Using vision model for real image.")
                chat_completion = self.groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_rules},
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": user_query},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{base64_image}",
                                    },
                                },
                            ],
                        }
                    ],
                    model="llama-3.2-11b-vision-preview",
                )
            
            result = chat_completion.choices[0].message.content
            print(f"AI Response generated: {result[:50]}...")
            return result
            
        except Exception as e:
            print(f"Groq API Error: {str(e)}")
            # Final fallback
            try:
                chat_completion = self.groq_client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_rules},
                        {"role": "user", "content": f"Scanned item: {fruit_hint}. User Question: {user_query}"}
                    ],
                    model="llama-3.3-70b-versatile",
                )
                return chat_completion.choices[0].message.content
            except:
                return f"I'm sorry, I encountered an error while processing your request: {str(e)}"
