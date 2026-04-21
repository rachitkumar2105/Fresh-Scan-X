import io
import os
import base64
from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

from .inference import FruitInference

app = FastAPI(title="FreshScanX Industry API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model
inference_system = None

@app.on_event("startup")
async def load_model():
    global inference_system
    try:
        model_path = "freshscanx_final_model.keras"
        inference_system = FruitInference(
            model_path=model_path,
            confidence_threshold=0.5
        )
        print("Industry-Ready Keras Model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")
        # Don't raise, let the health check show it
        inference_system = None

@app.get("/")
def home():
    return {"message": "FreshScanX Industry AI API is running"}

@app.get("/health")
def health():
    if inference_system:
        return {"status": "healthy", "model": "freshscanx_final_model.keras"}
    return {"status": "unhealthy", "error": "Model not loaded"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if inference_system is None:
        raise HTTPException(status_code=500, detail="Inference system not loaded")
    
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Inference using the new Keras system
        results = inference_system.predict_image(image)
        
        if not results:
            return {"error": "No items detected"}
            
        # For simplicity, return the first (best) result
        return results[0]
            
    except Exception as e:
        print(f"Prediction Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/explain")
async def explain(
    image_data: str = Form(...), 
    fruit: str = Form(None), 
    freshness: str = Form(None), 
    status: str = Form(None),
    api_key: str = Form(None),
    custom_prompt: str = Form(None)
):
    """
    LLM Explanation Endpoint
    """
    if inference_system is None:
        raise HTTPException(status_code=500, detail="Inference system not loaded")
    
    try:
        if api_key:
            inference_system.update_llm_config(api_key)
            
        if "," in image_data:
            image_data = image_data.split(",")[1]
            
        image_bytes = base64.b64decode(image_data)
        
        analysis = await inference_system.get_intelligent_analysis(image_bytes, fruit_hint=fruit, custom_prompt=custom_prompt)
        return {"explanation": analysis}
            
    except Exception as e:
        print(f"Explanation Error: {e}")
        return {"explanation": f"Failed to generate AI analysis: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
