import io
import torch
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image

from .inference import FruitInference

app = FastAPI()

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
        # Load the final inference system.
        # This completely removes any references to previously used models.
        inference_system = FruitInference(
            checkpoint_path="backend/fruit_checker_final.pth",
            confidence_threshold=0.65
        )
        print("Final model loaded successfully.")
    except Exception as e:
        print(f"Error loading final model: {e}")
        raise e

@app.api_route("/", methods=["GET", "HEAD"])
def home():
    return {"message": "Final Fruit Freshness Scanner API is running"}

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "healthy"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if inference_system is None:
        raise HTTPException(status_code=500, detail="Inference system not loaded")
    
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Inference using the final patch-based system
        results = inference_system.predict_image(image)
        
        # If the frontend expects a specific structure for a single result
        # we can provide the best one as primary, but also provide 'all_results'
        if not results:
            return {"error": "No fruits detected"}
            
        best_result = results[0]
        
        # We return the best result matching the exact schema required 
        # (dynamically either Fruit/Freshness/Conf/Feedback OR just Conf/Feedback)
        return best_result
            
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
