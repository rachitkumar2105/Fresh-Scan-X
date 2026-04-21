import os
import cv2
import numpy as np
import tensorflow as tf
from PIL import Image
import base64
from groq import Groq
from dotenv import load_dotenv
from .preprocessing import preprocess_image, extract_patches

load_dotenv()

class FruitInference:
    def __init__(self, model_path, confidence_threshold=0.5):
        print(f"Loading Keras model from {model_path}...")
        self.model = tf.keras.models.load_model(model_path)
        self.confidence_threshold = confidence_threshold
        
        # Configure Groq
        api_key = os.getenv("GROQ_API_KEY")
        if api_key:
            self.groq_client = Groq(api_key=api_key)
        else:
            self.groq_client = None
            print("Warning: GROQ_API_KEY not found in environment.")

    def update_llm_config(self, api_key):
        if api_key:
            self.groq_client = Groq(api_key=api_key)

    def validate_image(self, image_np):
        # 1. Resolution Check
        h, w = image_np.shape[:2]
        if h < 200 or w < 200:
            return False, "⚠️ Resolution too low. Please use a clearer image."

        # 2. Blur detection
        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # 3. Brightness check
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

        consumption_window = "Consume within 3-5 days" if freshness == "Fresh" else "Dispose immediately"
        risk_level = "High" if freshness == "Rotten" else ("Medium" if status == "Caution" else "Low")

        result = {
            "fruit": "Fruit Item",
            "freshness": freshness,
            "confidence": confidence * 100,
            "status": status,
            "consumption_window": consumption_window,
            "risk_level": risk_level,
            "message": f"Detected {freshness} item ({int(confidence*100)}% confidence)",
            "raw_score": rotten_prob
        }
        
        return [result]

    async def get_intelligent_analysis(self, image_bytes, fruit_hint=None, custom_prompt=None):
        if not self.groq_client:
            return "Please configure GROQ_API_KEY for advanced analysis."

        base64_image = base64.b64encode(image_bytes).decode('utf-8')
        
        prompt = custom_prompt if custom_prompt else f"""
        Analyze this food image. 
        1. Identify the primary fruit/vegetable.
        2. Give a detailed explanation of its freshness state (currently detected as {fruit_hint or 'unknown'}).
        3. Provide safety recommendations.
        4. Suggest a consumption window.
        """
        
        try:
            chat_completion = self.groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
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
            return chat_completion.choices[0].message.content
        except Exception as e:
            # Fallback to text-only if vision fails
            try:
                chat_completion = self.groq_client.chat.completions.create(
                    messages=[
                        {"role": "user", "content": f"I have a fruit that was detected as {fruit_hint or 'unknown'}. Give me safety tips and storage advice."}
                    ],
                    model="llama-3.3-70b-versatile",
                )
                return chat_completion.choices[0].message.content
            except Exception as e2:
                return f"GROQ Analysis Error: {str(e2)}"
