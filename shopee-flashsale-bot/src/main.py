"""
Shopee Flash Sale Bot - Main Entry Point
"""
import sys
import os

# Add project root to path (parent of src/)
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.config import load_config
from src.bot import FlashSaleBot


def main():
    print("=" * 50)
    print("  Shopee Flash Sale Bot")
    print("  Python API-based Auto Checkout")
    print("=" * 50)

    # Load config from config/.env (project root)
    env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config", ".env")
    if not os.path.exists(env_path):
        print(f"\n[X] Config file not found: {env_path}")
        print("[!] Copy config/.env.example to config/.env and fill in your data")
        sys.exit(1)

    try:
        config = load_config(env_path)
        print(f"\n[OK] Config loaded")
        print(f"   Shop ID: {config.shop_id}")
        print(f"   Item ID: {config.item_id}")
        print(f"   Flash Sale: {config.flashsale_time} {config.timezone}")
        print(f"   COD: {'Ya' if config.use_cod else 'Tidak'}")
        print(f"   Rate: {config.attempts_per_second} req/detik")
    except Exception as e:
        print(f"\n[ERROR] Config error: {e}")
        sys.exit(1)

    # Run bot
    bot = FlashSaleBot(config)
    result = bot.run()

    if result.success:
        print(f"\n[SUCCESS] BERHASIL! Order SN: {result.order_sn}")
        sys.exit(0)
    else:
        print(f"\n[FAILED] GAGAL: {result.error}")
        sys.exit(1)


if __name__ == "__main__":
    main()