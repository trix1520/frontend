from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.errors import SessionPasswordNeededError, PhoneCodeInvalidError, PhoneCodeExpiredError

import sys
sys.path.append('/var/task/api')
from auth import validate_init_data

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://web.telegram.org", "https://oauth.telegram.org"],
    allow_credentials=True,
    allow_methods=["POST", "GET", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

API_ID = int(os.environ.get("API_ID", "30123236"))
API_HASH = os.environ.get("API_HASH", "6738d78f08cc9e650cf8938c549ed410")

class PhoneRequest(BaseModel):
    phone: str

class CodeRequest(BaseModel):
    phone: str
    code: str
    phone_code_hash: str

async def get_client(phone: str):
    session = StringSession()
    client = TelegramClient(
        session,
        API_ID,
        API_HASH,
        device_model="WebApp",
        system_version="1.0",
        app_version="1.0",
        connection_retries=2
    )
    await client.connect()
    return client

@app.post("/api/request_code")
async def request_code(req: PhoneRequest, request: Request):
    init_data = request.headers.get("X-Telegram-Web-App-InitData", "")
    if not validate_init_data(init_data):
        raise HTTPException(status_code=403, detail="Invalid initData")
    
    client = None
    try:
        client = await get_client(req.phone)
        result = await client.send_code_request(req.phone)
        
        return {
            "ok": True,
            "phone_code_hash": result.phone_code_hash,
            "type": str(result.type)
        }
    except Exception as e:
        print(f"Request code error: {e}")
        return {"ok": False, "error": "Failed to send code"}
    finally:
        if client:
            await client.disconnect()

@app.post("/api/sign_in")
async def sign_in(req: CodeRequest, request: Request):
    init_data = request.headers.get("X-Telegram-Web-App-InitData", "")
    if not validate_init_data(init_data):
        raise HTTPException(status_code=403, detail="Invalid initData")
    
    client = None
    try:
        client = await get_client(req.phone)
        
        try:
            # Пытаемся войти с кодом
            await client.sign_in(
                phone=req.phone,
                code=req.code,
                phone_code_hash=req.phone_code_hash
            )
        except SessionPasswordNeededError:
            return {"ok": False, "error": "Two-factor authentication required"}
        except PhoneCodeInvalidError:
            return {"ok": False, "error": "Invalid verification code"}
        except PhoneCodeExpiredError:
            return {"ok": False, "error": "Verification code expired"}
        
        # Получаем информацию о пользователе
        me = await client.get_me()
        session_str = client.session.save()
        
        user_data = {
            "id": me.id,
            "first_name": me.first_name or "",
            "last_name": me.last_name or "",
            "username": me.username or "",
            "phone": me.phone or req.phone
        }
        
        return {
            "ok": True,
            "user": user_data,
            "session": session_str
        }
    except Exception as e:
        print(f"Sign in error: {e}")
        return {"ok": False, "error": str(e)}
    finally:
        if client:
            await client.disconnect()

@app.get("/api/health")
async def health():
    return {"status": "ok"}

@app.get("/")
async def root():
    return {"message": "Telegram Auth API - Running"}
