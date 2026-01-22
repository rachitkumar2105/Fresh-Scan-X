import requests
from PIL import Image
import io

# Create a dummy image
img = Image.new('RGB', (100, 100), color = 'red')
img_byte_arr = io.BytesIO()
img.save(img_byte_arr, format='JPEG')
img_byte_arr = img_byte_arr.getvalue()

url = 'http://localhost:8000/predict'
files = {'file': ('test.jpg', img_byte_arr, 'image/jpeg')}

try:
    response = requests.post(url, files=files)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
