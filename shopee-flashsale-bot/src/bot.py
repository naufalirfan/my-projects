"""
Flash Sale Bot - Checkout Logic
Mengelola alur: add to cart -> checkout preview -> place order
"""
import time
import random
import logging
from dataclasses import dataclass
from typing import Optional, Dict, Any
from datetime import datetime, timedelta

from .api import ShopeeAPI, APIResponse
from .config import ShopeeConfig


@dataclass
class CheckoutResult:
    success: bool
    order_sn: str = ""
    error: str = ""
    raw_data: Dict = None


class FlashSaleBot:
    def __init__(self, config: ShopeeConfig):
        self.config = config
        self.api = ShopeeAPI(config)
        self.logger = self._setup_logger()
        self.attempts = 0
        self.success = False
        self.order_sn = ""
        self.start_time = 0

    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger("FlashSaleBot")
        logger.setLevel(getattr(logging, self.config.log_level))

        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(message)s",
            datefmt="%H:%M:%S"
        )

        ch = logging.StreamHandler()
        ch.setFormatter(formatter)
        logger.addHandler(ch)

        if self.config.log_to_file:
            import os
            os.makedirs(os.path.dirname(self.config.log_file), exist_ok=True)
            fh = logging.FileHandler(self.config.log_file, encoding="utf-8")
            fh.setFormatter(formatter)
            logger.addHandler(fh)

        return logger

    def _wait_until_flashsale(self):
        """Tunggu sampai waktu flash sale (dengan pre-start buffer)"""
        tz = self.config.timezone_obj
        now = datetime.now(tz)

        fs_time_str = self.config.flashsale_time
        fs_hour, fs_min, fs_sec = map(int, fs_time_str.split(":"))
        fs_time = now.replace(hour=fs_hour, minute=fs_min, second=fs_sec, microsecond=0)

        if fs_time < now:
            fs_time += timedelta(days=1)

        wait_seconds = (fs_time - now).total_seconds() - self.config.pre_start_seconds

        if wait_seconds > 0:
            self.logger.info(f"Flash sale dimulai pukul {fs_time.strftime('%H:%M:%S')} WIB")
            self.logger.info(f"Menunggu {wait_seconds:.1f} detik sebelum mulai...")
            time.sleep(wait_seconds)

        self.logger.info(">>> WAKTU FLASH SALE DIMULAI! Mulai mencoba checkout...")

    def _check_product_availability(self) -> bool:
        """Cek stok produk sebelum flash sale"""
        self.logger.info("Memeriksa ketersediaan produk...")
        resp = self.api.get_product_detail(self.config.shop_id, self.config.item_id)

        if not resp.success:
            self.logger.warning(f"Gagal cek produk: {resp.error}")
            return True

        data = resp.data
        item = data.get("item", {})

        if item.get("is_flash_sale", False):
            flash_sale_info = item.get("flash_sale", {})
            stock = flash_sale_info.get("stock", 0)
            sold = flash_sale_info.get("sold", 0)
            self.logger.info(f"Flash sale aktif - Stok: {stock}, Terjual: {sold}")
            if stock - sold <= 0:
                self.logger.warning("[!] Stok flash sale habis!")
                return False
        else:
            models = item.get("models", [])
            if models:
                total_stock = sum(m.get("stock", 0) for m in models)
                if total_stock <= 0:
                    self.logger.warning("[!] Stok produk habis!")
                    return False

        return True

    def _add_to_cart(self) -> APIResponse:
        """Tambah produk ke keranjang"""
        return self.api.add_to_cart(
            shop_id=self.config.shop_id,
            item_id=self.config.item_id,
            model_id=self.config.model_id,
            quantity=self.config.quantity
        )

    def _checkout_preview(self) -> APIResponse:
        """Dapatkan info checkout (harga, ongkir, voucher)"""
        return self.api.get_checkout_info(
            shop_id=self.config.shop_id,
            item_id=self.config.item_id,
            model_id=self.config.model_id,
            quantity=self.config.quantity
        )

    def _place_order(self, checkout_data: Dict) -> APIResponse:
        """Kirim order checkout"""
        order_data = self._build_order_data(checkout_data)
        return self.api.place_order(order_data)

    def _build_order_data(self, checkout_data: Dict) -> Dict:
        """Bangun data order dari checkout preview"""
        data = checkout_data.get("data", checkout_data)

        order = {
            "shop_id": self.config.shop_id,
            "item_id": self.config.item_id,
            "model_id": self.config.model_id,
            "quantity": self.config.quantity,
            "checkout_method": 1,
            "promotion_data": {},
            "selected_address_id": self.config.address_id or 0,
            "buyer_note": self.config.buyer_note or "",
        }

        if self.config.use_cod:
            order["payment_method"] = 1

        if self.config.shop_voucher_id:
            order["promotion_data"]["shop_voucher_id"] = self.config.shop_voucher_id

        if self.config.voucher_code:
            order["promotion_data"]["voucher_code"] = self.config.voucher_code

        return order

    def _attempt_checkout(self) -> CheckoutResult:
        """Satu percobaan checkout penuh"""
        self.attempts += 1

        self.logger.debug(f"Attempt #{self.attempts}: Add to cart...")
        cart_resp = self._add_to_cart()
        if not cart_resp.success:
            return CheckoutResult(success=False, error=f"Add to cart failed: {cart_resp.error}")

        self.logger.debug(f"Attempt #{self.attempts}: Checkout preview...")
        preview_resp = self._checkout_preview()
        if not preview_resp.success:
            return CheckoutResult(success=False, error=f"Checkout preview failed: {preview_resp.error}")

        self.logger.debug(f"Attempt #{self.attempts}: Place order...")
        order_resp = self._place_order(preview_resp.raw or {})

        if order_resp.success:
            order_sn = order_resp.data.get("order_sn", "") if order_resp.data else ""
            return CheckoutResult(success=True, order_sn=order_sn, raw_data=order_resp.raw)
        else:
            return CheckoutResult(success=False, error=order_resp.error, raw_data=order_resp.raw)

    def run(self) -> CheckoutResult:
        """Jalankan bot flash sale"""
        self.logger.info("=" * 50)
        self.logger.info(">>> SHOPEE FLASH SALE BOT STARTED")
        self.logger.info(f"Target: shop_id={self.config.shop_id}, item_id={self.config.item_id}")
        self.logger.info(f"Flash sale time: {self.config.flashsale_time} WIB")
        self.logger.info("=" * 50)

        self.start_time = time.time()

        if not self.api.is_logged_in():
            self.logger.error("[X] Login gagal! Cek cookie SPC_EC di config/.env")
            return CheckoutResult(success=False, error="Not logged in")

        self.logger.info("[OK] Login berhasil")

        if not self._check_product_availability():
            return CheckoutResult(success=False, error="Produk tidak tersedia/stok habis")

        self._wait_until_flashsale()

        max_attempts = self.config.max_attempts
        attempt_delay = 1.0 / self.config.attempts_per_second

        while not self.success:
            if max_attempts > 0 and self.attempts >= max_attempts:
                self.logger.error(f"[X] Max attempts ({max_attempts}) reached")
                break

            result = self._attempt_checkout()

            if result.success:
                self.success = True
                self.order_sn = result.order_sn
                elapsed = time.time() - self.start_time
                self.logger.info(f"[OK] BERHASIL! Order SN: {result.order_sn} (percobaan #{self.attempts}, {elapsed:.2f}s)")
                break
            else:
                error_msg = result.error.lower()
                if "stock" in error_msg or "habis" in error_msg or "sold out" in error_msg:
                    self.logger.error(f"[X] Stok habis: {result.error}")
                    break
                elif "login" in error_msg or "unauthorized" in error_msg or "403" in error_msg:
                    self.logger.error(f"[X] Auth error: {result.error}")
                    break
                else:
                    self.logger.debug(f"Attempt #{self.attempts} gagal: {result.error}")

            time.sleep(attempt_delay + random.uniform(0, 0.05))

        elapsed = time.time() - self.start_time
        self.logger.info(f"[===] Total waktu: {elapsed:.2f}s | Percobaan: {self.attempts}")

        if not self.success:
            self.logger.error("[FAIL] GAGAL checkout flash sale")

        return CheckoutResult(success=self.success, order_sn=self.order_sn)