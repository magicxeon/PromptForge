"""Offline smoke check of the installed speech, translation and OCR models."""
import asyncio
import base64
import io
import json
import os
import subprocess
import sys
from pathlib import Path
import tempfile
from types import SimpleNamespace

SERVICE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE))

from fastapi import FastAPI
from PIL import Image, ImageDraw, ImageFont
from api.routes import router
from config.service_config import load_post_processing_config
from config.dub_model_manifest import verified_component


async def post(app, path, body, authenticated=True, method="POST"):
    data = json.dumps(body).encode()
    sent = []
    async def receive():
        return {"type":"http.request","body":data,"more_body":False}
    async def send(message):
        sent.append(message)
    headers = [(b"content-type", b"application/json")]
    if authenticated:
        headers.append((b"x-post-processing-token",b"test-only"))
    scope = {"type":"http","asgi":{"version":"3.0"},"method":method,"path":path,
             "headers":headers,"query_string":b"","http_version":"1.1","scheme":"http","root_path":""}
    await app(scope,receive,send)
    return sent[0]["status"], json.loads(b"".join(m.get("body",b"") for m in sent[1:]))


async def main():
    with tempfile.TemporaryDirectory() as scratch:
        root=Path(scratch)
        (root/"tessdata").mkdir()
        (root/"tessdata/eng.traineddata").write_bytes(b"unexpected model")
        try:
            verified_component(root,"eng")
        except ValueError:
            pass
        else:
            raise AssertionError("Corrupted OCR weights were accepted")
    app=FastAPI()
    app.state.config=load_post_processing_config(env={"POST_PROCESSING_INTERNAL_TOKEN":"dub-fixture-authorization-token-1234567890",
        **({"DUB_LANGUAGE_MODELS":os.environ["DUB_LANGUAGE_MODELS"]} if "DUB_LANGUAGE_MODELS" in os.environ else {})})
    app.state.config.runtime.internalToken="test-only"
    app.state.detector=SimpleNamespace(unavailable_reason="fixture")
    app.include_router(router)
    status,catalog=await post(app,"/v1/capabilities",{},method="GET")
    assert status==200 and all(catalog["operations"][key]["available"] for key in ("dub_translation","dub_subtitle_ocr"))
    assert (await post(app,"/v1/audio/translate",{"q":["x"*600000]}))[0]==413
    assert (await post(app,"/v1/audio/translate",{"q":["x"*600000]},False))[0]==401
    body={"source":"zh","target":"th","q":["你叫什么名字？"]}
    denied,_=await post(app,"/v1/audio/translate",body,False)
    assert denied==401
    status,result=await post(app,"/v1/audio/translate",body)
    assert status==200 and any("\u0e00"<=c<="\u0e7f" for c in result["translatedText"][0]), (status,result)
    assert "▁" not in result["translatedText"][0]
    print("Chinese to Thai:",ascii(result["translatedText"][0]),flush=True)
    frame=Image.new("RGB",(640,100),"white")
    font=ImageFont.truetype(str(SERVICE.parent/"client/assets/dub-sub/fonts/NotoSansSC.ttf"),44)
    ImageDraw.Draw(frame).text((16,8),"你好世界",font=font,fill="black")
    encoded=io.BytesIO()
    frame.save(encoded,format="PNG")
    status,data=await post(app,"/v1/audio/subtitle-ocr",{"language":"zh","frames":[base64.b64encode(encoded.getvalue()).decode()]})
    assert status==200 and "你好" in data["texts"][0].replace(" ",""),(status,data)
    print("Chinese OCR:",ascii(data["texts"][0]),flush=True)
    audio=subprocess.check_output([os.getenv("FFMPEG_PATH","ffmpeg"),"-nostdin","-v","error","-f","lavfi","-i",
        "flite=text='Welcome to the voice studio today':voice=slt","-ar","16000","-f","wav","pipe:1"])
    status,asr=await post(app,"/v1/audio/transcribe",{"language":"en","detectLanguage":False,"bytesBase64":base64.b64encode(audio).decode()})
    assert status==200 and not asr["fallbackUsed"] and asr["words"] and "welcome" in asr["text"].lower(),(status,asr.get("executionMode"))
    print("Whisper ASR:",asr["text"],asr["words"][0]["start"],asr["words"][-1]["end"],flush=True)

if __name__=="__main__":
    asyncio.run(main())
