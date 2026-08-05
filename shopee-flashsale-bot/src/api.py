"""
Shopee API Client untuk Flash Sale Bot
Endpoints: login, cart, checkout, order, voucher
"""
import time
import json
import random
import hashlib
import hmac
import urllib.parse
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from urllib.parse import urljoin

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from .config import ShopeeConfig


@dataclass
class APIResponse:
    success: bool
    data: Any = None
    error: Optional[str] = None
    raw: Optional[Dict] = None
    status_code: int = 0


class ShopeeAPI:
    BASE_API = "https://shopee.co.id/api/v4"
    BASE_WEB = "https://shopee.co.id"

    ENDPOINTS = {
        "check_login": "/auth/check_login_status",
        "login": "/account/login_by_password",
        "login_qr": "/account/login_qr_code",
        "check_qr": "/account/check_qr_code",
        "cart_get": "/cart/get",
        "cart_add": "/cart/add_item",
        "cart_update": "/cart/update_item",
        "cart_delete": "/cart/delete_item",
        "checkout": "/checkout/place_order",
        "checkout_preview": "/checkout/get_checkout_info",
        "order_list": "/order/get_order_list",
        "order_detail": "/order/get_order_detail",
        "product_detail": "/product/get_item_detail",
        "shop_info": "/shop/get_shop_base",
        "flashsale_info": "/flash_sale/get_flash_sale_info",
        "flashsale_items": "/flash_sale/get_flash_sale_items",
        "voucher_shop": "/voucher/wallet/get_shop_vouchers",
        "voucher_platform": "/voucher/wallet/get_platform_vouchers",
        "voucher_claim": "/voucher/wallet/claim_voucher",
        "address_list": "/address/get_address_list",
        "wallet_balance": "/wallet/get_wallet_info",
    }

    def __init__(self, config: ShopeeConfig):
        self.config = config
        self.session = self._create_session()
        self._set_cookies()
        self.csrf_token = config.csrf_token or self._get_csrf_from_cookies()
        self.request_id = 0

    def _create_session(self) -> requests.Session:
        session = requests.Session()
        retry = Retry(
            total=3,
            backoff_factor=0.3,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "OPTIONS", "POST"]
        )
        adapter = HTTPAdapter(max_retries=retry, pool_connections=10, pool_maxsize=20)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        session.headers.update({
            "User-Agent": self.config.user_agent,
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding": "gzip, deflate, br",
            "Content-Type": "application/json",
            "Origin": self.BASE_WEB,
            "Referer": self.BASE_WEB + "/",
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
            "X-Requested-With": "XMLHttpRequest",
            "X-Shopee-Language": "id",
            "X-Shopee-Client-Info": "desktop",
        })

        if self.config.http_proxy or self.config.https_proxy:
            session.proxies.update(self.config.proxies)

        return session

    def _set_cookies(self):
        cookies = self.config.cookies
        self._cookie_str = "; ".join(f"{k}={v}" for k, v in cookies.items())
        self._raw_cookies = cookies
        # Set Cookie header directly on session
        self.session.headers["Cookie"] = self._cookie_str

    def _get_csrf_from_cookies(self) -> str:
        return self._raw_cookies.get("csrftoken", "")

    def _sign_request(self, api_path: str, body: str = "") -> tuple:
        """Generate Shopee request signature (if needed)"""
        timestamp = int(time.time())
        token = self.config.cookies.get("SPC_EC", "") or self.config.cookies.get("SPC_U", "")
        base_string = f"{api_path}|{body}|{token}|{timestamp}"
        signature = hmac.new(
            token.encode() if token else b"",
            base_string.encode(),
            hashlib.sha256
        ).hexdigest()
        return timestamp, signature

    def _request(self, method: str, endpoint: str, **kwargs) -> APIResponse:
        url = urljoin(self.BASE_API, endpoint)

        headers = kwargs.pop("headers", {})
        if self.csrf_token:
            headers["X-CSRFToken"] = self.csrf_token
            headers["X-Requested-With"] = "XMLHttpRequest"

        if "json" in kwargs:
            body = json.dumps(kwargs["json"], separators=(",", ":"))
            kwargs["data"] = body
            del kwargs["json"]

        try:
            resp = self.session.request(
                method, url, headers=headers, timeout=self.config.request_timeout, **kwargs
            )
            self.request_id += 1

            if resp.status_code == 403:
                self._refresh_csrf()
                headers["X-CSRFToken"] = self.csrf_token
                resp = self.session.request(
                    method, url, headers=headers, timeout=self.config.request_timeout, **kwargs
                )

            data = resp.json() if resp.content else {}
            success = resp.status_code == 200 and data.get("error", 1) == 0
            error = data.get("error_msg") or data.get("message") or (None if success else f"HTTP {resp.status_code}")

            return APIResponse(
                success=success,
                data=data.get("data") if success else None,
                error=error,
                raw=data,
                status_code=resp.status_code
            )
        except requests.Timeout:
            return APIResponse(success=False, error="Request timeout", status_code=408)
        except requests.RequestException as e:
            return APIResponse(success=False, error=str(e), status_code=0)
        except json.JSONDecodeError:
            return APIResponse(success=False, error="Invalid JSON response", status_code=resp.status_code)

    def _refresh_csrf(self):
        self.csrf_token = self.session.cookies.get("csrftoken", "")
        self.session.headers["X-CSRFToken"] = self.csrf_token

    def get(self, endpoint: str, params: Dict = None) -> APIResponse:
        return self._request("GET", endpoint, params=params)

    def post(self, endpoint: str, json: Dict = None, data: str = None) -> APIResponse:
        return self._request("POST", endpoint, json=json, data=data)

    # ===== Auth =====
    def check_login(self) -> APIResponse:
        return self.get(self.ENDPOINTS["check_login"])

    def login_by_password(self, username: str, password: str) -> APIResponse:
        data = {
            "username": username,
            "password": password,
            "remember_me": True,
            "captcha": "",
            "device_fingerprint": self._gen_fingerprint()
        }
        return self.post(self.ENDPOINTS["login"], json=data)

    def _gen_fingerprint(self) -> str:
        return hashlib.md5(f"{self.config.user_agent}{time.time()}".encode()).hexdigest()[:16]

    # ===== Product =====
    def get_product_detail(self, shop_id: int, item_id: int) -> APIResponse:
        params = {"shop_id": shop_id, "item_id": item_id}
        return self.get(self.ENDPOINTS["product_detail"], params=params)

    def get_shop_info(self, shop_id: int) -> APIResponse:
        return self.get(self.ENDPOINTS["shop_info"], params={"shop_id": shop_id})

    # ===== Flash Sale =====
    def get_flash_sale_info(self) -> APIResponse:
        return self.get(self.ENDPOINTS["flashsale_info"])

    def get_flash_sale_items(self, offset: int = 0, limit: int = 50) -> APIResponse:
        params = {"offset": offset, "limit": limit, "sort_by": "time"}
        return self.get(self.ENDPOINTS["flashsale_items"], params=params)

    # ===== Cart =====
    def get_cart(self) -> APIResponse:
        return self.get(self.ENDPOINTS["cart_get"])

    def add_to_cart(self, shop_id: int, item_id: int, model_id: int = 0, quantity: int = 1) -> APIResponse:
        data = {
            "item_id": item_id,
            "model_id": model_id,
            "quantity": quantity,
            "shop_id": shop_id,
            "checkout": True,
            "source": "product_detail"
        }
        return self.post(self.ENDPOINTS["cart_add"], json=data)

    # ===== Checkout =====
    def get_checkout_info(self, shop_id: int, item_id: int, model_id: int = 0, quantity: int = 1) -> APIResponse:
        data = {
            "shop_id": shop_id,
            "item_id": item_id,
            "model_id": model_id,
            "quantity": quantity,
            "checkout_method": 1,
            "promotion_data": {},
            "selected_address_id": self.config.address_id or 0
        }
        return self.post(self.ENDPOINTS["checkout_preview"], json=data)

    def place_order(self, checkout_data: Dict) -> APIResponse:
        return self.post(self.ENDPOINTS["checkout"], json=checkout_data)

    # ===== Order =====
    def get_order_list(self, list_type: int = 3, offset: int = 0, limit: int = 20) -> APIResponse:
        params = {"list_type": list_type, "offset": offset, "limit": limit}
        return self.get(self.ENDPOINTS["order_list"], params=params)

    def get_order_detail(self, order_sn: str) -> APIResponse:
        return self.get(self.ENDPOINTS["order_detail"], params={"order_sn": order_sn})

    # ===== Voucher =====
    def get_shop_vouchers(self, shop_id: int) -> APIResponse:
        return self.get(self.ENDPOINTS["voucher_shop"], params={"shop_id": shop_id})

    def get_platform_vouchers(self) -> APIResponse:
        return self.get(self.ENDPOINTS["voucher_platform"])

    def claim_voucher(self, voucher_code: str, promotion_id: int) -> APIResponse:
        data = {"voucher_code": voucher_code, "promotion_id": promotion_id}
        return self.post(self.ENDPOINTS["voucher_claim"], json=data)

    # ===== Address =====
    def get_address_list(self) -> APIResponse:
        return self.get(self.ENDPOINTS["address_list"])

    # ===== Wallet =====
    def get_wallet_balance(self) -> APIResponse:
        return self.get(self.ENDPOINTS["wallet_balance"])

    # ===== Helper =====
    def is_logged_in(self) -> bool:
        resp = self.check_login()
        return resp.success and resp.data.get("is_login", False)

    def get_csrf_token(self) -> str:
        return self.csrf_token