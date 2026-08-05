#!/usr/bin/env python3
"""
Auto-extract Shopee cookies & product IDs from Chrome browser.
Run once, it saves to config/.env
"""
import os
import sys
import json
import sqlite3
import shutil
import tempfile
import base64
from pathlib import Path
import re

try:
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from webdriver_manager.chrome import ChromeDriverManager
    from selenium.webdriver.chrome.service import Service
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False

try:
    import win32crypt
    DPAPI_AVAILABLE = True
except ImportError:
    DPAPI_AVAILABLE = False


def get_chrome_user_data():
    local_app = os.environ.get("LOCALAPPDATA", "")
    return Path(local_app) / "Google" / "Chrome" / "User Data"


def find_profiles_with_shopee_cookies():
    """Scan all Chrome profiles, find ones with SPC_EC cookie"""
    user_data = get_chrome_user_data()
    if not user_data.exists():
        return []

    results = []
    for profile_dir in user_data.iterdir():
        if not profile_dir.is_dir():
            continue
        cookie_path = profile_dir / "Network" / "Cookies"
        if not cookie_path.exists():
            cookie_path = profile_dir / "Cookies"
        if not cookie_path.exists():
            continue

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".db").name
        try:
            shutil.copy2(cookie_path, tmp)
            conn = sqlite3.connect(tmp)
            cur = conn.cursor()
            cur.execute("SELECT name FROM cookies WHERE name='SPC_EC' AND host_key LIKE '%shopee%' LIMIT 1")
            if cur.fetchone():
                results.append(profile_dir.name)
            conn.close()
        except Exception:
            pass
        finally:
            try:
                os.unlink(tmp)
            except:
                pass

    return results


def extract_ids_from_url(url):
    patterns = [
        r'\.(\d+)\.(\d+)(?:\?|$)',
        r'i\.(\d+)\.(\d+)',
    ]
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return int(m.group(1)), int(m.group(2))
    return None, None


def save_env(spc_ec, shop_id, item_id, other_cookies=None):
    env_path = Path(__file__).parent.parent / "config" / ".env"
    env_path.parent.mkdir(exist_ok=True)

    lines = [
        f"SHOPEE_SPC_EC={spc_ec}",
        f"SHOP_ID={shop_id}",
        f"ITEM_ID={item_id}",
        "",
        "# Optional cookies",
    ]

    cookie_map = {
        "SPC_R_T_ID": "SHOPEE_SPC_R_T_ID",
        "SPC_U": "SHOPEE_SPC_U",
        "SPC_F": "SHOPEE_SPC_F",
        "csrftoken": "SHOPEE_CSRFTOKEN",
        "SPC_SI": "SHOPEE_SPC_SI",
    }

    if other_cookies:
        for ck, env_key in cookie_map.items():
            if ck in other_cookies:
                lines.append(f"{env_key}={other_cookies[ck]}")

    lines.extend([
        "",
        "FLASHSLE_TIME=10:00:00",
        "ATTEMPTS_PER_SECOND=5",
        "USE_COD=true",
        "MODEL_ID=0",
    ])

    env_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"[OK] Config saved to {env_path}")
    return env_path


def method_selenium():
    """Open Chrome with existing profile via Selenium, extract cookies"""
    if not SELENIUM_AVAILABLE:
        print("[ERR] pip install selenium webdriver-manager")
        return None

    print("[*] Scanning Chrome profiles for SPC_EC...")
    profiles = find_profiles_with_shopee_cookies()
    if not profiles:
        print("[ERR] No profile with SPC_EC found. Login to Shopee in Chrome first.")
        return None

    profile_name = profiles[0]
    user_data = get_chrome_user_data()
    print(f"[OK] Found profile: {profile_name}")
    print(f"[!] CLOSE CHROME FIRST, then press ENTER")
    input()

    print(f"[*] Opening Chrome...")
    opts = Options()
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)
    opts.add_argument("--no-first-run")
    opts.add_argument("--no-default-browser-check")
    opts.add_argument(f"--user-data-dir={user_data}")
    opts.add_argument(f"--profile-directory={profile_name}")

    import time
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=opts)
    time.sleep(3)
    driver.get("https://shopee.co.id")

    try:
        input("\n[WAIT] Verify you're logged in, then press ENTER... ")

        current_url = driver.current_url
        shop_id, item_id = extract_ids_from_url(current_url)

        if not shop_id:
            url = input("[?] Paste product URL: ").strip()
            shop_id, item_id = extract_ids_from_url(url)

        cookies = {c["name"]: c["value"] for c in driver.get_cookies()}
        shopee_ck = {k: v for k, v in cookies.items() if k in ['SPC_EC', 'SPC_R_T_ID', 'SPC_U', 'SPC_F', 'csrftoken', 'SPC_SI']}
        print(f"[DEBUG] Cookies: {list(shopee_ck.keys())}")

        spc_ec = cookies.get("SPC_EC")
        if not spc_ec:
            print("[ERR] SPC_EC not found")
            return None

        return cookies, shop_id, item_id

    finally:
        driver.quit()


def main():
    print("=" * 50)
    print("  Shopee Auto-Config Generator")
    print("=" * 50)

    profiles = find_profiles_with_shopee_cookies()
    print(f"Profiles with SPC_EC: {profiles}")

    if SELENIUM_AVAILABLE and profiles:
        print("\nUsing Selenium (recommended)...")
        result = method_selenium()
    else:
        print("[ERR] No profiles found or Selenium not installed")
        return 1

    if not result:
        return 1

    cookies, shop_id, item_id = result
    save_env(cookies["SPC_EC"], shop_id, item_id, cookies)

    print("\n[DONE] Run bot:")
    print("  python src/main.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
