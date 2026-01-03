import torch
from torchvision import transforms

def get_transforms():
    """
    Returns the transformation pipeline for inference (same as test_tf in notebook).
    """
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    ])

def get_fruit_classes():
    """
    Returns the list of fruit classes.
    Model has 15 classes.
    """
    return [f'Fruit_{i}' for i in range(15)]

def get_freshness_classes():
    """
    Returns mapping for freshness head.
    Notebook logic: 'fresh' vs 'rotten'.
    """
    return ['fresh', 'rotten']
