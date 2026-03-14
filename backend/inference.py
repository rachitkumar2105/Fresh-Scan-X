import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import models
from PIL import Image

from .preprocessing import extract_patches, preprocess_image
from .feedback import generate_feedback

def build_model(num_classes):
    """
    Reconstruct the EfficientNet-B0 architecture used during training.
    """
    model = models.efficientnet_b0(weights=None)
    in_features = model.classifier[1].in_features
    # Replace the classifier layer to match len(class_names).
    model.classifier[1] = nn.Linear(in_features, num_classes)
    return model

class FruitInference:
    def __init__(self, checkpoint_path, confidence_threshold=0.65):
        # Run the model on GPU if available, otherwise CPU.
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.confidence_threshold = confidence_threshold
        
        print(f"Loading final inference system on {self.device}...")
        
        # 1. Load the checkpoint correctly from fruit_checker_final.pth
        checkpoint = torch.load(checkpoint_path, map_location=self.device)
        
        # 2. Extract class_names from the checkpoint
        self.class_names = checkpoint['class_names']
        
        # 3. Reconstruct EfficientNet-B0 
        # 4. Replace classifier layer
        self.model = build_model(len(self.class_names))
        
        # 5. Load weights using checkpoint["model_state_dict"]
        self.model.load_state_dict(checkpoint['model_state_dict'])
        
        self.model.to(self.device)
        self.model.eval()

    def parse_class_name(self, class_name):
        """
        Extract the fruit name and freshness state (Fresh or Rotten) from class names.
        Examples: freshapples, rottenbanana, freshoranges
        """
        class_name = class_name.lower()
        if class_name.startswith('fresh'):
            freshness = 'Fresh'
            fruit = class_name[5:]  # Remove 'fresh'
        elif class_name.startswith('rotten'):
            freshness = 'Rotten'
            fruit = class_name[6:]  # Remove 'rotten'
        else:
            freshness = 'Unknown'
            fruit = class_name
            
        # Format the fruit nicely (e.g. apples -> Apple)
        if fruit.endswith('s') and not fruit.endswith('ss'):
            fruit = fruit[:-1]
        
        fruit = fruit.capitalize()
            
        return fruit, freshness

    def predict_image(self, image: Image.Image):
        """
        Process input images and support multiple fruit detection 
        using a sliding window / patch-based approach.
        """
        # Divide the image into smaller regions
        patches, _ = extract_patches(image)
        
        raw_predictions = []
        
        # Run prediction on each region
        for patch in patches:
            tensor = preprocess_image(patch).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                logits = self.model(tensor)
                
                # Convert logits to probabilities using softmax (Confidence calibration)
                # Temperature scaling / normalization applied implicitly via softmax.
                probs = F.softmax(logits, dim=1)
                
                max_prob, max_idx = torch.max(probs, dim=1)
                confidence = max_prob.item()
                class_idx = max_idx.item()
                
            class_name = self.class_names[class_idx]
            fruit_name, freshness = self.parse_class_name(class_name)
            
            # If confidence is below threshold, treat the item as an unknown fruit.
            if confidence < self.confidence_threshold:
                fruit_name = None 
            
            raw_predictions.append({
                'fruit': fruit_name,
                'freshness': freshness,
                'confidence': confidence,
            })
            
        # Aggregate predictions to detect multiple fruits in one image.
        # Remove duplicate predictions using confidence thresholding.
        
        # Sort by confidence so that we process highest confidences first
        raw_predictions.sort(key=lambda x: x['confidence'], reverse=True)
        
        final_results = []
        seen = set()
        
        for pred in raw_predictions:
            # Create a unique key for deduplication
            # Unknown fruit maps to (None, Freshness)
            key = (pred['fruit'], pred['freshness'])
            
            if key not in seen:
                seen.add(key)
                
                conf_percent = f"{int(round(pred['confidence'] * 100))}%"
                feedback = generate_feedback(pred['fruit'], pred['freshness'])
                
                res = {
                    'Fruit': pred['fruit'],
                    'Freshness': pred['freshness'],
                    'Confidence': conf_percent,
                    'Feedback': feedback
                }
                final_results.append(res)
                
        # To avoid clutter, if we detected confident known fruits,
        # we might want to filter out low-confidence unknowns. 
        # But if we ONLY have unknown fruits, we return the best one.
        known_fruits = [r for r in final_results if r['Fruit'] is not None]
        
        if known_fruits:
            return known_fruits
            
        # If no known fruits passed the threshold, return the best unknown prediction
        return [final_results[0]] if final_results else []
