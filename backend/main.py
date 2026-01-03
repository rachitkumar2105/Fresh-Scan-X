import io
import torch
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from .model import FruitChecker
from .utils import get_transforms, get_fruit_classes, get_freshness_classes

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev; restrict in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model
model = None
device = None
transform = None
fruit_classes = None
freshness_classes = None

@app.on_event("startup")
async def load_model():
    global model, device, transform, fruit_classes, freshness_classes
    
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    fruit_classes = get_fruit_classes()
    freshness_classes = get_freshness_classes()
    
    # Initialize model
    model = FruitChecker(n_date_classes=len(fruit_classes))
    
    # Load weights
    try:
        # Load the state dict. Map location to cpu if no cuda available.
        state_dict = torch.load("backend/fruit_checker_final.pth", map_location=device)
        model.load_state_dict(state_dict)
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")
        # We don't raise here to allow app to start, but predict will fail.
        # Ideally we might want to crush if model doesn't load.
        raise e

    model.to(device)
    model.eval()
    
    transform = get_transforms()

@app.api_route("/", methods=["GET", "HEAD"])
def home():
    return {"message": "Fruit Freshness Scanner API is running"}

@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "healthy"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        
        # Transform
        input_tensor = transform(image).unsqueeze(0).to(device)
        
        # Inference
        with torch.no_grad():
            fruit_out, fresh_out = model(input_tensor)
            
            # Apply softmax to get probabilities
            fruit_probs = torch.nn.functional.softmax(fruit_out, dim=1)
            fresh_probs = torch.nn.functional.softmax(fresh_out, dim=1)
            
            # Get predictions
            fruit_idx = torch.argmax(fruit_probs, dim=1).item()
            fresh_idx = torch.argmax(fresh_probs, dim=1).item()
            
            fruit_conf = fruit_probs[0][fruit_idx].item() * 100
            fresh_conf = fresh_probs[0][fresh_idx].item() * 100
            
            # Helper logic:
            # We want to return the confidence of the freshness prediction mainly?
            # Or the confidence of the overall prediction? 
            # The dashboard expects 'confidence' as a single number.
            # Let's use the freshness confidence.
            
            result = {
                "result": freshness_classes[fresh_idx],  # 'fresh' or 'rotten'
                "confidence": round(fresh_conf, 2),
                "fruitType": fruit_classes[fruit_idx],
                "fruitConfidence": round(fruit_conf, 2)
            }
            
            return result
            
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))
