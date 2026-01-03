from PIL import Image
img = Image.new('RGB', (224, 224), color = 'red')
img.save('test_scan.jpg')
