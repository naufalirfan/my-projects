import os
import json
import logging
import httpx
import tempfile
from datetime import datetime
from collections import defaultdict
from dotenv import load_dotenv
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters,
)

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("telegram-ai-bot")

load_dotenv()

# --- Config ---
BOT_TOKEN = os.getenv("BOT_TOKEN", "")
AI_ROUTER_URL = os.getenv("AI_ROUTER_URL", "http://127.0.0.1:20128")
TELEGRAM_API_BASE = os.getenv("TELEGRAM_API_BASE", "https://api.telegram.org")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "auto")
MAX_HISTORY = int(os.getenv("MAX_HISTORY", "20"))
ALLOWED_USERS = os.getenv("ALLOWED_USERS", "")

allowed_user_ids = set()
if ALLOWED_USERS.strip():
    allowed_user_ids = {int(uid.strip()) for uid in ALLOWED_USERS.split(",") if uid.strip().isdigit()}

# --- State ---
user_history: dict[int, list[dict]] = defaultdict(list)
user_model: dict[int, str] = {}

# --- Models cache ---
available_models: list[dict] = []


async def fetch_models():
    global available_models
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{AI_ROUTER_URL}/v1/models")
            if resp.status_code == 200:
                data = resp.json()
                available_models = data.get("data", [])
                logger.info(f"Fetched {len(available_models)} models")
    except Exception as e:
        logger.error(f"Failed to fetch models: {e}")


def get_user_model(user_id: int) -> str:
    return user_model.get(user_id, DEFAULT_MODEL)


async def call_ai(user_id: int, messages: list[dict], model: str = None) -> str:
    model = model or get_user_model(user_id)
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.7,
        "max_tokens": 2048,
    }
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{AI_ROUTER_URL}/v1/chat/completions",
                json=payload,
            )
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                provider = data.get("x_provider", "unknown")
                logger.info(f"User {user_id} | Model: {model} | Provider: {provider}")
                return content
            else:
                return f"Error dari AI router: {resp.status_code} - {resp.text[:200]}"
    except httpx.ConnectError:
        return "Tidak bisa terhubung ke AI router. Pastikan AI router sudah jalan."
    except Exception as e:
        return f"Error: {str(e)}"


def check_access(user_id: int) -> bool:
    if not allowed_user_ids:
        return True
    return user_id in allowed_user_ids


# --- Handlers ---

def get_keyboard():
    return ReplyKeyboardMarkup(
        [
            [KeyboardButton("/model"), KeyboardButton("/status")],
            [KeyboardButton("/history"), KeyboardButton("/clear")],
        ],
        resize_keyboard=True,
    )


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not check_access(update.effective_user.id):
        await update.message.reply_text("Akses ditolak.")
        return
    await update.message.reply_text(
        "AI Assistant Bot\n\n"
        "Ketik pesan untuk chat dengan AI.\n"
        "Kirim gambar untuk analisis.\n"
        "Kirim file untuk review/rangkum.",
        reply_markup=get_keyboard(),
    )


async def status_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not check_access(update.effective_user.id):
        return
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{AI_ROUTER_URL}/health")
            if resp.status_code == 200:
                data = resp.json()
                model = get_user_model(update.effective_user.id)
                await update.message.reply_text(
                    f"AI Router: Online\n"
                    f"Providers aktif: {data.get('providers', 0)}\n"
                    f"Model kamu: {model}\n"
                    f"Riwayat: {len(user_history[update.effective_user.id])} pesan",
                    reply_markup=get_keyboard(),
                )
            else:
                await update.message.reply_text("AI Router merespon dengan error.")
    except Exception:
        await update.message.reply_text("AI Router tidak dapat dijangkau.")


async def model_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not check_access(update.effective_user.id):
        return
    if not available_models:
        await fetch_models()
    if not available_models:
        await update.message.reply_text("Tidak ada model tersedia. Coba lagi nanti.")
        return

    current = get_user_model(update.effective_user.id)
    buttons = []
    row = []
    for i, m in enumerate(available_models[:20]):
        mid = m.get("id", "")
        label = mid.split("/")[-1] if "/" in mid else mid
        if len(label) > 25:
            label = label[:22] + "..."
        check = " ✓" if mid == current else ""
        row.append(InlineKeyboardButton(f"{label}{check}", callback_data=f"model:{mid}"))
        if len(row) == 2:
            buttons.append(row)
            row = []
    if row:
        buttons.append(row)
    buttons.append([InlineKeyboardButton("Atau ketik manual: /setmodel <model_id>", callback_data="noop")])

    await update.message.reply_text(
        f"Model saat ini: {current}\nPilih model baru:",
        reply_markup=InlineKeyboardMarkup(buttons),
    )


async def setmodel_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not check_access(update.effective_user.id):
        return
    if context.args:
        model_id = " ".join(context.args)
        user_model[update.effective_user.id] = model_id
        await update.message.reply_text(f"Model diubah ke: {model_id}")
    else:
        await update.message.reply_text("Cara pakai: /setmodel <model_id>")


async def model_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    if not check_access(query.from_user.id):
        return
    data = query.data
    if data.startswith("model:"):
        model_id = data[6:]
        user_model[query.from_user.id] = model_id
        await query.edit_message_text(f"Model diubah ke: {model_id}")


async def history_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not check_access(update.effective_user.id):
        return
    history = user_history[update.effective_user.id]
    if not history:
        await update.message.reply_text("Riwayat kosong.")
        return
    lines = []
    for msg in history[-10:]:
        role = "Kamu" if msg["role"] == "user" else "AI"
        content = msg["content"][:80]
        lines.append(f"[{role}] {content}")
    await update.message.reply_text("Riwayat terakhir:\n\n" + "\n".join(lines))


async def clear_cmd(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not check_access(update.effective_user.id):
        return
    user_history[update.effective_user.id].clear()
    await update.message.reply_text("Riwayat dihapus.")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not check_access(update.effective_user.id):
        return

    user_id = update.effective_user.id
    user_text = update.message.text

    history = user_history[user_id]
    history.append({"role": "user", "content": user_text})

    if len(history) > MAX_HISTORY * 2:
        history = history[-(MAX_HISTORY * 2):]
        user_history[user_id] = history

    system_msg = {
        "role": "system",
        "content": (
            "Kamu adalah AI assistant yang membantu. "
            "Jawab dengan singkat, jelas, dan dalam bahasa Indonesia. "
            "Kamu bisa membantu tugas kuliah, coding, dan pertanyaan umum."
        ),
    }
    messages = [system_msg] + history

    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")

    reply = await call_ai(user_id, messages)
    history.append({"role": "assistant", "content": reply})
    user_history[user_id] = history

    if len(reply) > 4000:
        for i in range(0, len(reply), 4000):
            await update.message.reply_text(reply[i : i + 4000])
    else:
        await update.message.reply_text(reply)


async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not check_access(update.effective_user.id):
        return

    user_id = update.effective_user.id
    caption = update.message.caption
    if not caption:
        await update.message.reply_text("Kirim foto dengan caption (teks) untuk saya bantu.")
        return

    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")

    history = user_history[user_id]
    history.append({"role": "user", "content": f"[Foto] {caption}"})

    system_msg = {
        "role": "system",
        "content": (
            "Kamu adalah AI assistant yang membantu. "
            "Pengguna mengirim foto dengan caption. "
            "Bantu berdasarkan caption yang diberikan. "
            "Jawab dalam bahasa Indonesia."
        ),
    }
    messages = [system_msg] + history

    reply = await call_ai(user_id, messages)
    history.append({"role": "assistant", "content": reply})
    user_history[user_id] = history

    await update.message.reply_text(reply)


async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not check_access(update.effective_user.id):
        return

    user_id = update.effective_user.id
    doc = update.message.document
    caption = update.message.caption or "Baca dan rangkum file ini"

    await context.bot.send_chat_action(chat_id=update.effective_chat.id, action="typing")

    text_extensions = {".txt", ".md", ".py", ".js", ".ts", ".java", ".c", ".cpp",
                       ".html", ".css", ".json", ".yaml", ".yml", ".xml", ".csv",
                       ".log", ".sh", ".bat", ".sql", ".r", ".go", ".rs", ".php"}

    file_name = doc.file_name or ""
    ext = os.path.splitext(file_name)[1].lower()

    if ext not in text_extensions:
        await update.message.reply_text(
            f"Format `{ext}` belum didukung.\n"
            f"Yang didukung: {', '.join(sorted(text_extensions)[:10])}...",
        )
        return

    if doc.file_size and doc.file_size > 10 * 1024 * 1024:
        await update.message.reply_text("File terlalu besar (maks 10MB).")
        return

    file = await context.bot.get_file(doc.file_id)

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        await file.download_to_drive(tmp.name)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
    except Exception as e:
        await update.message.reply_text(f"Gagal membaca file: {e}")
        return
    finally:
        os.unlink(tmp_path)

    if len(content) > 8000:
        content = content[:8000] + "\n\n... (dipotong, terlalu panjang)"

    history = user_history[user_id]
    history.append({"role": "user", "content": f"[File: {file_name}]\n\n{content}\n\n{caption}"})

    system_msg = {
        "role": "system",
        "content": (
            "Kamu adalah AI assistant yang bisa menganalisis kode dan file teks. "
            "Jawab pertanyaan atau buat rangkuman dalam bahasa Indonesia. "
            "Jika diminta review kode, berikan saran perbaikan."
        ),
    }
    messages = [system_msg] + history

    reply = await call_ai(user_id, messages)
    history.append({"role": "assistant", "content": reply})
    user_history[user_id] = history

    if len(reply) > 4000:
        for i in range(0, len(reply), 4000):
            await update.message.reply_text(reply[i : i + 4000])
    else:
        await update.message.reply_text(reply)


async def error_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    logger.error(f"Error: {context.error}")


def main():
    if not BOT_TOKEN:
        print("Error: Set environment variable BOT_TOKEN")
        print("Contoh: export BOT_TOKEN=123456:ABC-DEF...")
        return

    print("=" * 50)
    print("  Telegram AI Bot")
    print(f"  Telegram API: {TELEGRAM_API_BASE}")
    print(f"  AI Router   : {AI_ROUTER_URL}")
    print(f"  Model       : {DEFAULT_MODEL}")
    print(f"  Max History : {MAX_HISTORY}")
    print(f"  Allowed     : {'Semua' if not allowed_user_ids else allowed_user_ids}")
    print("=" * 50)

    app = Application.builder().token(BOT_TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", start))
    app.add_handler(CommandHandler("status", status_cmd))
    app.add_handler(CommandHandler("model", model_cmd))
    app.add_handler(CommandHandler("setmodel", setmodel_cmd))
    app.add_handler(CommandHandler("history", history_cmd))
    app.add_handler(CommandHandler("clear", clear_cmd))
    app.add_handler(CallbackQueryHandler(model_callback, pattern=r"^model:"))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))
    app.add_error_handler(error_handler)

    app.run_polling(drop_pending_updates=True)


if __name__ == "__main__":
    main()
