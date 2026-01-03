import numpy
import torch
print("Numpy version:", numpy.__version__)
print("Torch version:", torch.__version__)
try:
    x = torch.tensor([1,2])
    n = x.numpy()
    print("Tensor to numpy conversion success")
except Exception as e:
    print("Conversion failed:", e)
