import torch
from torchvision import transforms
from PIL import Image

def get_transforms():
    """
    Returns the transformation pipeline for ImageNet-based models.
    """
    return transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                             std=[0.229, 0.224, 0.225]),
    ])

def preprocess_image(image: Image.Image):
    transform = get_transforms()
    return transform(image)

def extract_patches(image: Image.Image, patch_size=(224, 224), stride=(112, 112)):
    """
    Extracts patches from an image using a sliding window approach for multiple fruit detection.
    """
    patches = []
    coords = []
    width, height = image.size
    
    # If the image is smaller than the patch size, just return the resized image
    if width <= patch_size[0] or height <= patch_size[1]:
        return [image.resize(patch_size)], [(0, 0, width, height)]

    for y in range(0, max(1, height - patch_size[1] + 1), stride[1]):
        for x in range(0, max(1, width - patch_size[0] + 1), stride[0]):
            box = (x, y, min(x + patch_size[0], width), min(y + patch_size[1], height))
            patch = image.crop(box)
            # Resize if necessary (e.g., edge patches might be smaller)
            if patch.size != patch_size:
                patch = patch.resize(patch_size)
            patches.append(patch)
            coords.append(box)
            
    if not patches:
        return [image.resize(patch_size)], [(0, 0, width, height)]
        
    return patches, coords
