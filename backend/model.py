import torch
import torch.nn as nn
from torchvision import models

class FruitChecker(nn.Module):
    def __init__(self, n_date_classes=15):
        # n_date_classes corresponds to the fruits. ERROR log showed 15 classes.
        # We defaults to 15 to match the saved model weights.
        super().__init__()
        # weights=None to prevent downloading ImageNet weights (we load our own)
        base = models.efficientnet_b3(weights=None)
        self.features = base.features
        self.pool = nn.AdaptiveAvgPool2d(1)
        # The notebook had:
        # self.fruit_head = nn.Linear(1536, n)
        # self.fresh_head = nn.Linear(1536, 2)
        # efficientnet_b3's last channel size is 1536.
        self.fruit_head = nn.Linear(1536, n_date_classes)
        self.fresh_head = nn.Linear(1536, 2)

    def forward(self, x):
        x = self.features(x)
        x = self.pool(x).flatten(1)
        return self.fruit_head(x), self.fresh_head(x)
