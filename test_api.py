import requests

try:
    url = 'http://localhost:8000/predict'
    files = {'file': open('test_scan.jpg', 'rb')}
    response = requests.post(url, files=files)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
