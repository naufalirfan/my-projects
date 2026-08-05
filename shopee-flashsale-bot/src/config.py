import os
from pathlib import Path
from dataclasses import dataclass, field
from typing import Optional
from dotenv import load_dotenv
import pytz


@dataclass
class ShopeeConfig:
    spc_ec: str = ""
    spc_r_t_id: str = ""
    spc_u: str = ""
    spc_f: str = ""
    csrftoken: str = ""
    spc_si: str = ""
    csrf_token: str = ""
    user_agent: str = ""

    shop_id: int = 0
    item_id: int = 0
    model_id: int = 0
    quantity: int = 1

    flashsale_time: str = "10:00:00"
    timezone: str = "Asia/Jakarta"
    pre_start_seconds: int = 3
    attempts_per_second: int = 5
    max_attempts: int = 0

    use_cod: bool = True
    shop_voucher_id: str = ""
    voucher_code: str = ""
    address_id: str = ""
    buyer_note: str = ""

    shopee_api_url: str = "https://shopee.co.id/api/v4"
    shopee_web_url: str = "https://shopee.co.id"
    request_timeout: int = 10
    retry_delay_ms: int = 100
    log_level: str = "INFO"
    log_to_file: bool = True
    log_file: str = "logs/flashsale.log"

    http_proxy: str = ""
    https_proxy: str = ""

    _timezone: pytz.timezone = field(init=False, repr=False)

    def __post_init__(self):
        self._timezone = pytz.timezone(self.timezone)

    @property
    def timezone_obj(self) -> pytz.timezone:
        return self._timezone

    @property
    def cookies(self) -> dict:
        cookies = {}
        if self.spc_ec:
            cookies["SPC_EC"] = self.spc_ec
        if self.spc_r_t_id:
            cookies["SPC_R_T_ID"] = self.spc_r_t_id
        if self.spc_u:
            cookies["SPC_U"] = self.spc_u
        if self.spc_f:
            cookies["SPC_F"] = self.spc_f
        if self.csrftoken:
            cookies["csrftoken"] = self.csrftoken
        if self.spc_si:
            cookies["SPC_SI"] = self.spc_si
        return cookies

    @property
    def headers(self) -> dict:
        headers = {
            "User-Agent": self.user_agent,
            "Content-Type": "application/json",
            "Referer": self.shopee_web_url,
            "Origin": self.shopee_web_url,
            "X-Requested-With": "XMLHttpRequest",
            "X-Shopee-Language": "id",
            "X-Shopee-Region": "ID",
        }
        if self.csrf_token:
            headers["X-CSRFToken"] = self.csrf_token
            headers["X-CSRFTOKEN"] = self.csrf_token
        return headers

    @property
    def proxies(self) -> dict:
        proxies = {}
        if self.http_proxy:
            proxies["http"] = self.http_proxy
        if self.https_proxy:
            proxies["https"] = self.https_proxy
        return proxies

    @property
    def checkout_payload(self) -> dict:
        payload = {
            "shop_id": self.shop_id,
            "item_id": self.item_id,
            "quantity": self.quantity,
            "model_id": self.model_id,
            "checkout_method": 1 if self.use_cod else 2,
            "buyer_note": self.buyer_note,
        }
        if self.address_id:
            payload["address_id"] = int(self.address_id)
        if self.shop_voucher_id:
            payload["shop_voucher_id"] = int(self.shop_voucher_id)
        if self.voucher_code:
            payload["voucher_code"] = self.voucher_code
        return payload


def load_config(env_path: Optional[str] = None) -> ShopeeConfig:
    if env_path:
        load_dotenv(env_path, override=True)
    else:
        load_dotenv(override=True)

    def get_env(key: str, default: str = "") -> str:
        return os.getenv(key, default)

    def get_env_int(key: str, default: int = 0) -> int:
        val = os.getenv(key)
        return int(val) if val and val.isdigit() else default

    def get_env_bool(key: str, default: bool = False) -> bool:
        val = os.getenv(key, "").lower()
        return val in ("true", "1", "yes", "on") if val else default

    config = ShopeeConfig(
        spc_ec=get_env("SHOPEE_SPC_EC"),
        spc_r_t_id=get_env("SHOPEE_SPC_R_T_ID"),
        spc_u=get_env("SHOPEE_SPC_U"),
        spc_f=get_env("SHOPEE_SPC_F"),
        csrftoken=get_env("SHOPEE_CSRFTOKEN"),
        spc_si=get_env("SHOPEE_SPC_SI"),
        csrf_token=get_env("SHOPEE_CSRF_TOKEN"),
        user_agent=get_env("USER_AGENT", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"),

        shop_id=get_env_int("SHOP_ID"),
        item_id=get_env_int("ITEM_ID"),
        model_id=get_env_int("MODEL_ID", 0),
        quantity=get_env_int("QUANTITY", 1),

        flashsale_time=get_env("FLASHSLE_TIME", "10:00:00"),
        timezone=get_env("TIMEZONE", "Asia/Jakarta"),
        pre_start_seconds=get_env_int("PRE_START_SECONDS", 3),
        attempts_per_second=get_env_int("ATTEMPTS_PER_SECOND", 5),
        max_attempts=get_env_int("MAX_ATTEMPTS", 0),

        use_cod=get_env_bool("USE_COD", True),
        shop_voucher_id=get_env("SHOP_VOUCHER_ID"),
        voucher_code=get_env("VOUCHER_CODE"),
        address_id=get_env("ADDRESS_ID"),
        buyer_note=get_env("BUYER_NOTE"),

        shopee_api_url=get_env("SHOPEE_API_URL", "https://shopee.co.id/api/v4"),
        shopee_web_url=get_env("SHOPEE_WEB_URL", "https://shopee.co.id"),
        request_timeout=get_env_int("REQUEST_TIMEOUT", 10),
        retry_delay_ms=get_env_int("RETRY_DELAY_MS", 100),
        log_level=get_env("LOG_LEVEL", "INFO"),
        log_to_file=get_env_bool("LOG_TO_FILE", True),
        log_file=get_env("LOG_FILE", "logs/flashsale.log"),

        http_proxy=get_env("HTTP_PROXY"),
        https_proxy=get_env("HTTPS_PROXY"),
    )

    if not config.spc_ec and not config.cookies:
        raise ValueError("SHOPEE_SPC_EC cookie wajib diisi! Ambil dari browser DevTools > Cookies > SPC_EC")

    if not config.shop_id or not config.item_id:
        raise ValueError("SHOP_ID dan ITEM_ID wajib diisi! Ambil dari URL produk Shopee")

    return config


if __name__ == "__main__":
    try:
        config = load_config()
        print("Config loaded successfully!")
        print(f"Shop ID: {config.shop_id}")
        print(f"Item ID: {config.item_id}")
        print(f"Flashsale: {config.flashsale_time} {config.timezone}")
        print(f"Cookies: {list(config.cookies.keys())}")
    except Exception as e:
        print(f"Config error: {e}")