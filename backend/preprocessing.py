import numpy as np
from PIL import Image

def preprocess_image(image: Image.Image, target_size=(224, 224)):
    """
    Preprocesses the image for TensorFlow Keras model.
    """
    # Resize image
    img = image.resize(target_size)
    # Convert to numpy array
    img_array = np.array(img).astype('float32')
    # Normalize to [0, 1]
    img_array /= 255.0
    # Add batch dimension
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

def extract_patches(image: Image.Image, patch_size=(224, 224), stride=(112, 112)):
    """
    Extracts patches from an image for multi-object detection.
    """
    width, height = image.size
    patches = []
    coords = []

    if width <= patch_size[0] or height <= patch_size[1]:
        return [image.resize(patch_size)], [(0, 0, width, height)]

    for y in range(0, height - patch_size[1] + 1, stride[1]):
        for x in range(0, width - patch_size[0] + 1, stride[0]):
            box = (x, y, x + patch_size[0], y + patch_size[1])
            patch = image.crop(box)
            patches.append(patch)
            coords.append(box)
    
    if not patches:
        return [image.resize(patch_size)], [(0, 0, width, height)]
        
    return patches, coords
