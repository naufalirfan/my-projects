"""
Shopee Flash Sale Bot
Auto-checkout bot untuk flash sale Shopee menggunakan API HTTP
"""
__version__ = "1.0.0"
__author__ = "Auto-generated"

from .config import ShopeeConfig, load_config
from .api import ShopeeAPI, APIResponse
from .bot import FlashSaleBot, CheckoutResult

__all__ = [
    "ShopeeConfig",
    "load_config",
    "ShopeeAPI",
    "APIResponse",
    "FlashSaleBot",
    "CheckoutResult",
]