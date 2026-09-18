import hashlib
import hmac
import logging
import time
import uuid
from typing import Optional
from fastapi import APIRouter, Request, Header, HTTPException, Response, status
from fastapi.responses import JSONResponse, HTMLResponse

from domain.faceless_previs import FacelessPrevisManager, faceless_previs_manager, HTTPException_Like
from domain.face_landmarks import FaceLandmarksManager, face_landmarks_manager
from domain.image_enhancement_manager import ImageEnhancementManager, image_enhancement_manager
from domain.expressive_tts_manager import ExpressiveTtsManager, expressive_tts_manager
from domain.telemetry_manager import TelemetryManager, telemetry_manager
from domain.video_processing_manager import VideoProcessingManager, video_processing_manager
from domain.audio_analysis_manager import AudioAnalysisManager, audio_analysis_manager
from domain.audio_transcription_manager import audio_transcription_manager
from domain.job_queue import job_queue_manager

logger = logging.getLogger("post_processing.api")
router = APIRouter()

# 1. Health Probe Endpoints
@router.get("/health", response_class=JSONResponse)
@router.get("/v1/health", response_class=JSONResponse)
def health_check():
    return {"service": "post-processing", "status": "running"}

# 2. Capabilities Endpoint
@router.get("/v1/capabilities", response_class=JSONResponse)
def get_capabilities(request: Request, x_post_processing_token: Optional[str] = Header(None)):
    verify_internal_token(request, x_post_processing_token)
    
    app_state = request.app.state
    config = app_state.config
    detector = app_state.detector
    policy = config.policy
    enhancement_policy = getattr(config, "imageEnhancement", None)
    
    available = detector.unavailable_reason is None
    reason = detector.unavailable_reason
    model_hash = policy.model.sha256 if available else None
    
    ops = {
        "faceless_previs": {
            "available": available,
            "reason": reason,
            "policyVersion": policy.policyVersion,
            "modelHash": model_hash,
            "maxBytes": policy.maxInputBytes,
            "maxPixels": policy.maxPixels,
            "maxFaces": policy.maxFaces
        },
        "face_landmarks": {
            "available": available,
            "reason": reason,
            "policyVersion": policy.policyVersion,
            "modelHash": model_hash,
            "maxBytes": policy.maxInputBytes,
            "maxPixels": policy.maxPixels,
            "maxFaces": policy.maxFaces
        }
    }

    if enhancement_policy:
        ops["image_upscale"] = {
            "available": True,
            "reason": None,
            "policyVersion": enhancement_policy.policyVersion,
            "maxBytes": enhancement_policy.maxInputBytes,
            "maxPixels": enhancement_policy.maxPixels,
            "maxOutputPixels": enhancement_policy.maxOutputPixels,
            "allowedScales": enhancement_policy.allowedScales,
            "defaultScale": enhancement_policy.defaultScale
        }
        ops["image_enhance"] = {
            "available": True,
            "reason": None,
            "policyVersion": enhancement_policy.policyVersion,
            "maxBytes": enhancement_policy.maxInputBytes,
            "maxPixels": enhancement_policy.maxPixels,
            "maxOutputPixels": enhancement_policy.maxOutputPixels,
            "allowedScales": enhancement_policy.allowedScales
        }

    ops["video_interpolate"] = {
        "available": True,
        "reason": None,
        "policyVersion": "video-processing-v1",
        "maxBytes": 104857600,
        "allowedTargetFps": [24, 30, 60]
    }
    ops["video_enhance"] = {
        "available": True,
        "reason": None,
        "policyVersion": "video-processing-v1",
        "maxBytes": 104857600
    }
    ops["audio_transcribe"] = {
        "available": True,
        "reason": None,
        "policyVersion": "audio-analysis-v1",
        "maxBytes": 52428800,
        "defaultLanguage": "th"
    }
    ops["audio_diarize"] = {
        "available": True,
        "reason": None,
        "policyVersion": "audio-analysis-v1",
        "maxBytes": 52428800,
        "maxSpeakers": 8
    }

    return {
        "apiVersion": "1",
        "operations": ops
    }

# 3. Telemetry Metrics Endpoint
@router.get("/v1/metrics", response_class=JSONResponse)
def get_metrics(request: Request, x_post_processing_token: Optional[str] = Header(None)):
    verify_internal_token(request, x_post_processing_token)
    detector = request.app.state.detector
    available = detector.unavailable_reason is None
    return telemetry_manager.get_metrics(detector_available=available)

# 4. Faceless Previs Endpoint (Returns JSON with bytesBase64)
@router.post("/v1/faceless-previs", response_class=JSONResponse)
async def post_faceless_previs(
    request: Request,
    x_post_processing_token: Optional[str] = Header(None),
    x_input_sha256: Optional[str] = Header(None),
    x_expected_faces: Optional[int] = Header(None)
):
    verify_internal_token(request, x_post_processing_token)
    start_time = time.time()
    telemetry_manager.record_request_start()

    app_state = request.app.state
    config = app_state.config
    detector = app_state.detector
    policy = config.policy

    if detector.unavailable_reason:
        telemetry_manager.record_request_failure()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": {"code": "face_model_unavailable", "message": "The face model is unavailable."}}
        )

    try:
        bytes_data = await request.body()
        if len(bytes_data) > policy.maxInputBytes:
            telemetry_manager.record_request_failure()
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "faceless_input_size_invalid", "message": "Image exceeds the supported size."}}
            )

        actual_hash = hashlib.sha256(bytes_data).hexdigest()
        if x_input_sha256 != actual_hash:
            telemetry_manager.record_request_failure()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "input_hash_mismatch", "message": "Input hash did not match."}}
            )

        if x_expected_faces is None:
            telemetry_manager.record_request_failure()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "faceless_expected_faces_invalid", "message": f"Expected visible face count must be 1 to {policy.maxFaces}."}}
            )

        result = faceless_previs_manager.process(
            bytes_data=bytes_data,
            detector=detector,
            expected_faces=x_expected_faces,
            policy=policy
        )

        duration_ms = (time.time() - start_time) * 1000
        telemetry_manager.record_request_success(duration_ms)
        clean_result = {k: v for k, v in result.items() if k != "bytes"}
        return JSONResponse(status_code=200, content=clean_result)

    except HTTPException_Like as ex:
        telemetry_manager.record_request_failure()
        raise HTTPException(
            status_code=ex.status_code,
            detail={"error": {"code": ex.code, "message": ex.message}}
        )
    except HTTPException:
        raise
    except Exception as e:
        telemetry_manager.record_request_failure()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "faceless_processing_failed", "message": str(e)}}
        )

# 5. Face Landmarks Endpoint (Returns JSON coordinates)
@router.post("/v1/face-landmarks", response_class=JSONResponse)
async def post_face_landmarks(
    request: Request,
    x_post_processing_token: Optional[str] = Header(None),
    x_input_sha256: Optional[str] = Header(None),
    x_expected_faces: Optional[int] = Header(None)
):
    verify_internal_token(request, x_post_processing_token)
    start_time = time.time()
    telemetry_manager.record_request_start()

    app_state = request.app.state
    config = app_state.config
    detector = app_state.detector
    policy = config.policy

    if detector.unavailable_reason:
        telemetry_manager.record_request_failure()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": {"code": "face_model_unavailable", "message": "The face model is unavailable."}}
        )

    try:
        bytes_data = await request.body()
        if len(bytes_data) > policy.maxInputBytes:
            telemetry_manager.record_request_failure()
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "faceless_input_size_invalid", "message": "Image exceeds the supported size."}}
            )

        actual_hash = hashlib.sha256(bytes_data).hexdigest()
        if x_input_sha256 != actual_hash:
            telemetry_manager.record_request_failure()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "input_hash_mismatch", "message": "Input hash did not match."}}
            )

        result = face_landmarks_manager.process(
            bytes_data=bytes_data,
            detector=detector,
            expected_faces=x_expected_faces,
            policy=policy
        )

        duration_ms = (time.time() - start_time) * 1000
        telemetry_manager.record_request_success(duration_ms)
        return JSONResponse(status_code=200, content=result)

    except HTTPException_Like as ex:
        telemetry_manager.record_request_failure()
        raise HTTPException(
            status_code=ex.status_code,
            detail={"error": {"code": ex.code, "message": ex.message}}
        )
    except HTTPException:
        raise
    except Exception as e:
        telemetry_manager.record_request_failure()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "faceless_processing_failed", "message": str(e)}}
        )

# 6. Image Enhancement & Upscaling Endpoints
@router.post("/v1/image-upscale", response_class=JSONResponse)
@router.post("/v1/image-enhance", response_class=JSONResponse)
async def post_image_upscale_or_enhance(
    request: Request,
    x_post_processing_token: Optional[str] = Header(None),
    x_input_sha256: Optional[str] = Header(None),
    x_scale: Optional[int] = Header(None),
    x_sharpen: Optional[bool] = Header(None),
    x_restore_faces: Optional[bool] = Header(None),
    x_denoise: Optional[bool] = Header(None),
    x_contrast_restoration: Optional[bool] = Header(None),
    x_anti_aliasing: Optional[bool] = Header(None),
    x_use_ai_engine: Optional[bool] = Header(None)
):
    verify_internal_token(request, x_post_processing_token)
    start_time = time.time()
    telemetry_manager.record_request_start()

    app_state = request.app.state
    config = app_state.config
    enhancement_policy = getattr(config, "imageEnhancement", None) or config.policy

    try:
        bytes_data = await request.body()
        if len(bytes_data) > enhancement_policy.maxInputBytes:
            telemetry_manager.record_request_failure()
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "enhancement_input_size_invalid", "message": "Image exceeds the supported size."}}
            )

        if x_input_sha256:
            actual_hash = hashlib.sha256(bytes_data).hexdigest()
            if x_input_sha256 != actual_hash:
                telemetry_manager.record_request_failure()
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error": {"code": "input_hash_mismatch", "message": "Input hash did not match."}}
                )

        scale = x_scale if x_scale is not None else 2
        sharpen = x_sharpen if x_sharpen is not None else True
        restore_faces = x_restore_faces if x_restore_faces is not None else False
        denoise = x_denoise if x_denoise is not None else False
        contrast_restoration = x_contrast_restoration if x_contrast_restoration is not None else True
        anti_aliasing = x_anti_aliasing if x_anti_aliasing is not None else True
        use_ai_engine = x_use_ai_engine if x_use_ai_engine is not None else True

        logger.info(
            f"[HTTP_POST {request.url.path}] Request received: body={len(bytes_data)} bytes, "
            f"scale={scale}x, sharpen={sharpen}, anti_aliasing={anti_aliasing}, use_ai={use_ai_engine}"
        )

        result = image_enhancement_manager.process(
            bytes_data=bytes_data,
            scale=scale,
            sharpen=sharpen,
            restore_faces=restore_faces,
            denoise=denoise,
            contrast_restoration=contrast_restoration,
            anti_aliasing=anti_aliasing,
            use_ai_engine=use_ai_engine,
            policy=enhancement_policy
        )

        duration_ms = (time.time() - start_time) * 1000
        telemetry_manager.record_request_success(duration_ms)
        logger.info(
            f"[HTTP_200 {request.url.path}] Completed in {duration_ms:.2f}ms: "
            f"target={result['targetWidth']}x{result['targetHeight']} px, mode={result['executionMode']}"
        )
        response_content = {k: v for k, v in result.items() if k != "bytes"}
        return JSONResponse(status_code=200, content=response_content)

    except HTTPException:
        raise
    except Exception as e:
        if hasattr(e, "status_code") and hasattr(e, "code"):
            telemetry_manager.record_request_failure()
            raise HTTPException(
                status_code=getattr(e, "status_code", 400),
                detail={"error": {"code": getattr(e, "code", "processing_failed"), "message": getattr(e, "message", str(e))}}
            )
        telemetry_manager.record_request_failure()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "enhancement_processing_failed", "message": str(e)}}
        )

# 6.5. Audio Transcription Endpoint
@router.post("/v1/transcribe", response_class=JSONResponse)
async def post_audio_transcribe(
    request: Request,
    x_post_processing_token: Optional[str] = Header(None)
):
    import base64
    verify_internal_token(request, x_post_processing_token)
    try:
        data = await request.json()
        audio_base64 = data.get("audioBase64")
        if not audio_base64:
            raise HTTPException(status_code=400, detail={"error": {"code": "missing_audioBase64", "message": "audioBase64 is required"}})
        
        audio_bytes = base64.b64decode(audio_base64)
        result = audio_transcription_manager.transcribe(audio_bytes=audio_bytes)
        return JSONResponse(status_code=200, content=result)
    except Exception as e:
        logger.error(f"[ASR_API_ERROR] {e}")
        raise HTTPException(status_code=500, detail={"error": {"code": "transcription_failed", "message": str(e)}})


# 7. Thonburian-TTS (F5-TTS Flow Matching) Endpoints & Web Playground

@router.get("/v1/expressive-tts/voices", response_class=JSONResponse)
@router.get("/v1/thonburian-tts/voices", response_class=JSONResponse)
def get_expressive_tts_voices(request: Request, x_post_processing_token: Optional[str] = Header(None)):
    verify_internal_token(request, x_post_processing_token)
    from adapters.thonburian_tts_adapter import THONBURIAN_VOICE_CATALOG
    return JSONResponse(status_code=200, content={"voices": THONBURIAN_VOICE_CATALOG})


@router.get("/tts-playground", response_class=HTMLResponse)
def get_tts_playground():
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Momelo Thonburian-TTS Movie Dubbing Studio</title>
<style>
  :root {
    --bg-main: #0f172a;
    --card-bg: #1e293b;
    --card-border: #334155;
    --accent-purple: #8b5cf6;
    --accent-blue: #3b82f6;
    --accent-green: #10b981;
    --text-primary: #f8fafc;
    --text-muted: #94a3b8;
  }
  body {
    background-color: var(--bg-main);
    color: var(--text-primary);
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    margin: 0; padding: 24px;
    display: flex; justify-content: center; align-items: flex-start;
    min-height: 100vh;
  }
  .container {
    width: 100%; max-width: 880px;
    background-color: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: 16px; padding: 32px;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
  }
  h1 { margin-top: 0; color: #a78bfa; font-size: 1.8rem; display: flex; align-items: center; gap: 10px; }
  p.subtitle { color: var(--text-muted); margin-bottom: 24px; font-size: 0.95rem; }
  label { display: block; font-weight: 600; margin-bottom: 8px; font-size: 0.9rem; color: #cbd5e1; }
  textarea {
    width: 100%; height: 110px; background: #0f172a; border: 1px solid var(--card-border);
    border-radius: 8px; color: #fff; padding: 12px; font-size: 1rem; box-sizing: border-box;
    resize: vertical; outline: none; margin-bottom: 12px;
  }
  textarea:focus { border-color: var(--accent-purple); }
  .btn-tag {
    background: #334155; border: none; color: #e2e8f0; padding: 6px 14px; border-radius: 20px;
    font-size: 0.85rem; cursor: pointer; transition: all 0.2s; margin-bottom: 16px;
  }
  .btn-tag:hover { background: var(--accent-purple); color: #fff; }
  
  .step-card {
    background: #1e293b; border: 1px solid var(--card-border); border-radius: 12px;
    padding: 20px; margin-bottom: 24px;
  }
  .step-header {
    display: flex; align-items: center; gap: 14px; margin-bottom: 16px; border-bottom: 1px solid #334155;
    padding-bottom: 12px;
  }
  .step-num {
    background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color: #fff;
    font-weight: 800; font-size: 1.2rem; width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .step-title { margin: 0; font-size: 1.15rem; color: #f1f5f9; }
  .step-sub { margin: 2px 0 0 0; font-size: 0.85rem; color: var(--text-muted); }

  /* Mode Tabs */
  .mode-tabs {
    display: flex; gap: 12px; margin-bottom: 16px;
  }
  .tab-btn {
    flex: 1; background: #0f172a; border: 1px solid var(--card-border); color: var(--text-muted);
    padding: 12px; border-radius: 8px; font-weight: 600; font-size: 0.95rem; cursor: pointer;
    text-align: center; transition: all 0.2s;
  }
  .tab-btn.active {
    background: #2e1065; border-color: var(--accent-purple); color: #c4b5fd;
    box-shadow: 0 0 10px rgba(139, 92, 246, 0.3);
  }

  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  select, input[type="number"], input[type="range"], input[type="file"] {
    width: 100%; background: #0f172a; border: 1px solid var(--card-border); color: #fff;
    padding: 10px; border-radius: 8px; box-sizing: border-box; font-size: 0.95rem;
  }
  
  .upload-panel {
    background: #0f172a; border: 1px dashed var(--accent-purple); padding: 16px;
    border-radius: 10px; margin-bottom: 12px; display: none;
  }
  .status-badge {
    display: inline-block; padding: 6px 14px; border-radius: 12px; font-size: 0.88rem;
    font-weight: 600; margin-top: 10px; width: 100%; box-sizing: border-box;
  }
  .badge-active { background: #064e3b; color: #a7f3d0; border: 1px solid #059669; }
  .badge-none { background: #451a03; color: #fde68a; border: 1px solid #d97706; }

  .btn-submit {
    width: 100%; background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
    border: none; color: #fff; font-size: 1.15rem; font-weight: 700; padding: 16px;
    border-radius: 10px; cursor: pointer; transition: transform 0.1s, box-shadow 0.2s;
    display: flex; justify-content: center; align-items: flex-start; gap: 10px;
  }
  .btn-submit:hover { box-shadow: 0 10px 20px -3px rgba(139, 92, 246, 0.5); }
  .btn-submit:active { transform: scale(0.99); }
  
  .result-card {
    margin-top: 20px; padding: 20px; background: #0f172a; border-radius: 12px;
    border: 1px solid #059669; display: none;
  }
  audio { width: 100%; margin-top: 12px; }
  .meta-info { font-size: 0.88rem; color: var(--text-muted); margin-top: 12px; line-height: 1.7; }
  .spinner {
    width: 22px; height: 22px; border: 3px solid rgba(255,255,255,0.3);
    border-radius: 50%; border-top-color: #fff; animation: spin 0.8s linear infinite; display: none;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  
  .catalog-box {
    margin-top: 28px; background: #0f172a; border: 1px solid var(--card-border);
    border-radius: 12px; padding: 20px;
  }
  .catalog-box h3 { margin-top:0; color: #a78bfa; font-size: 1.1rem; }
  .voice-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
  .voice-card {
    background: #1e293b; border: 1px solid #334155; padding: 12px; border-radius: 8px; font-size: 0.88rem;
  }
  .voice-card strong { color: #f1f5f9; display: block; margin-bottom: 4px; }
  .voice-card span { color: #94a3b8; font-size: 0.8rem; }
  
  /* Error Dialog */
  .error-modal {
    display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.7); z-index: 1000; justify-content: center; align-items: center;
  }
  .error-modal-content {
    background: #1e293b; border: 1px solid #ef4444; border-radius: 12px;
    padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.2);
    text-align: center;
  }
  .error-modal h3 { color: #f87171; margin-top: 0; }
  .error-modal p { color: #f1f5f9; font-size: 0.95rem; line-height: 1.5; word-break: break-word; }
  .btn-close-modal {
    background: #334155; border: none; color: #fff; padding: 10px 20px;
    border-radius: 8px; cursor: pointer; font-weight: bold; margin-top: 16px;
  }
  .btn-close-modal:hover { background: #475569; }
</style>
</head>
<body>
<div class="container">
  <h1>🎬 Momelo Thonburian-TTS Movie Dubbing Studio</h1>
  <p class="subtitle">ระบบพากย์เสียงภาพยนตร์ภาษาไทย และ Zero-Shot Voice Sampling (Thonburian-TTS F5-TTS Architecture)</p>
  
  <!-- STEP 1: VOICE SOURCE SELECTION -->
  <div class="step-card">
    <div class="step-header">
      <span class="step-num">1</span>
      <div>
        <h3 class="step-title">เลือกต้นแบบเสียง (Voice Selection)</h3>
        <p class="step-sub">เลือกว่าจะใช้เสียง Default หรือ โคลนนิ่งเสียงจากไฟล์ของคุณเอง (Zero-Shot Voice Cloning)</p>
      </div>
    </div>
    
    <div class="mode-tabs">
      <div class="tab-btn active" id="tabPreset" onclick="switchVoiceMode('preset')">
        🎙️ เสียงพากย์ Default
      </div>
      <div class="tab-btn" id="tabSample" onclick="switchVoiceMode('sample')">
        🧬 โคลนนิ่งเสียงจากไฟล์ (Upload)
      </div>
    </div>

    <!-- Panel A: Default Voice -->
    <div id="panelPreset" class="upload-panel" style="display: block; border-color: var(--card-border);">
      <p style="margin: 0; color: #cbd5e1; font-weight: bold;">✅ ใช้เสียง Default ในระบบ</p>
      
      <label for="presetVoiceSelect" style="margin-top: 12px;">เลือกเสียงต้นแบบ (Preset Voice):</label>
      <select id="presetVoiceSelect" style="margin-top: 6px;">
        <option value="default" selected>🇹🇭 แจ็กกี้ ชาน (Jackie Chan)</option>
        <option value="morgan_freeman">🇺🇸 มอร์แกน ฟรีแมน (Morgan Freeman)</option>
      </select>

      <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 12px; margin-bottom: 0;">ไม่ต้องอัปโหลดไฟล์ และไม่ต้องพิมพ์ Reference Text ระบบจะจัดการให้โดยอัตโนมัติ</p>
    </div>

    <!-- Panel B: Upload Custom Reference Audio -->
    <div id="panelSample" class="upload-panel" style="display: none;">
      <label for="refAudioFile">🎙️ เลือกไฟล์เสียงอ้างอิง (Reference Audio .mp3 / .wav 3-15 วิ):</label>
      <input type="file" id="refAudioFile" accept="audio/*" onchange="previewAudioFile(this)">
      <audio id="refAudioPreview" controls style="display:none; margin-top:12px; width:100%;"></audio>
      
      <label for="refTextInput" style="margin-top: 16px;">💬 พิมพ์ประโยคที่พูดในไฟล์เสียงด้านบน (Reference Text):</label>
      <div style="display: flex; gap: 8px; align-items: center; width: 100%;">
        <input type="text" id="refTextInput" placeholder="เช่น: นี่คือเสียงต้นแบบภาษาไทย สำหรับใช้ในการสังเคราะห์เสียงครับ" style="flex: 1; background: #0f172a; border: 1px solid var(--card-border); color: #fff; padding: 10px; border-radius: 8px; box-sizing: border-box; font-size: 0.95rem;">
        <button id="btnTranscribe" onclick="autoTranscribe()" class="btn-tag" style="margin: 0; padding: 10px 16px; background: #2563eb; color: #fff; font-weight: bold; border-radius: 8px; display: none; white-space: nowrap;">✨ ถอดความอัตโนมัติ</button>
      </div>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 6px; margin-bottom: 0;">* บังคับต้องพิมพ์ข้อความให้ตรงกับเสียงเพื่อความแม่นยำในการโคลน</p>

      <div id="samplingStatus" class="status-badge badge-none" style="margin-top: 16px;">⚠️ ยังไม่ได้เลือกไฟล์เสียงอ้างอิง</div>
    </div>
  </div>

  <!-- STEP 2: DIALOGUE & EMOTION SETTINGS -->
  <div class="step-card">
    <div class="step-header">
      <span class="step-num">2</span>
      <div>
        <h3 class="step-title">กรอกบทพากย์ & ปรับแต่งอารมณ์ (Dialogue & Emotion Settings)</h3>
        <p class="step-sub">พิมพ์บทพากย์ภาษาไทย และกำหนดโทนอารมณ์/ความเร็วในการพูด</p>
      </div>
    </div>

    <label for="textInput">บทพากย์ภาษาไทย (Movie Dialogue / Script):</label>
    <textarea id="textInput" placeholder="พิมพ์บทพากย์ภาษาไทย หรือใส่แท็กจังหวะพากย์ เช่น [uv_break]...">ยินดีที่ได้รู้จักคุณ ผมชื่อแจ็กกี้ มาจากฮ่องกง แสดงหนังหลายเรื่อง</textarea>
    
    <button class="btn-tag" onclick="insertTag('[uv_break]')">+ [uv_break] (เว้นจังหวะหายใจ)</button>

    <div class="grid-2">
      <div>
        <label for="emotionSelect">อารมณ์พากย์ (Emotion Tone):</label>
        <select id="emotionSelect">
          <option value="neutral" selected>Neutral (ปกติ / สุภาพ)</option>
          <option value="happy">Happy (สดใส / อารมณ์ดี)</option>
          <option value="sad">Sad (เศร้า / ซึม / ทุ้ม)</option>
          <option value="excited">Excited (ตื่นเต้น / Action / โกรธ)</option>
        </select>
      </div>
      <div>
        <label>CFG Strength (ระดับความเข้มข้นอารมณ์: <span id="cfgVal">2.0</span>):</label>
        <input type="range" id="cfgRange" min="1.0" max="5.0" step="0.5" value="2.0" oninput="document.getElementById('cfgVal').innerText = this.value">
      </div>
    </div>

    <div class="grid-2">
      <div>
        <label>Speed (ความเร็วพูด: <span id="speedVal">1.0</span>x):</label>
        <input type="range" id="speedRange" min="0.5" max="2.0" step="0.1" value="1.0" oninput="document.getElementById('speedVal').innerText = this.value">
      </div>
      <div>
        <label>ความยาวสูงสุดต่อท่อน (Chunk Length): <span id="chunkVal">100</span> ตัวอักษร</label>
        <input type="range" id="chunkRange" min="30" max="200" step="5" value="100" oninput="document.getElementById('chunkVal').innerText = this.value">
      </div>
    </div>
  </div>

  <!-- STEP 3: SYNTHESIS & OUTPUT -->
  <div class="step-card">
    <div class="step-header">
      <span class="step-num">3</span>
      <div>
        <h3 class="step-title">สังเคราะห์เสียง & ฟังผลลัพธ์ (Synthesis & Audio Output)</h3>
        <p class="step-sub">กดสร้างเสียงพากย์ และรับไฟล์เสียง wav คุณภาพสูง</p>
      </div>
    </div>

    <button class="btn-submit" id="btnGenerate" onclick="generateAudio()">
      <div class="spinner" id="loadingSpinner"></div>
      <span id="btnText">🎬 เริ่มสังเคราะห์เสียงพากย์ภาพยนตร์ (Generate Audio)</span>
    </button>

    <div class="result-card" id="resultCard">
      <h3 style="margin-top:0; color:#10b981;">✅ สังเคราะห์เสียงพากย์สำเร็จ (Dubbing Complete)</h3>
      <audio id="audioPlayer" controls style="width: 100%; margin-bottom: 12px;"></audio>
      <a id="downloadAudioBtn" class="btn-submit" style="display: none; text-decoration: none; text-align: center; background: #3b82f6; width: max-content; padding: 8px 16px; margin: 0 auto; display: block; border-radius: 6px; font-weight: bold; margin-bottom: 12px;" download="thonburian_tts_output.wav">
        ⬇️ ดาวน์โหลดไฟล์เสียง (Download .wav)
      </a>
      <div class="meta-info" id="metaInfo"></div>
    </div>
  </div>

  <div class="catalog-box">
    <h3>📖 รายการเสียงพากย์ต้นแบบในระบบ (Thonburian-TTS Voice Catalog)</h3>
    <div class="voice-grid">
      <div class="voice-card">
        <strong>🇹🇭 เปรมวดี (Premwadee) - หญิง</strong>
        <span>เสียงพากย์ภาพยนตร์อารมณ์ธรรมชาติ ใส นุ่มนวล สมจริง</span>
      </div>
      <div class="voice-card">
        <strong>🇹🇭 นิวัฒน์ (Niwat) - ชาย</strong>
        <span>เสียงพากย์ตัวละครชายทรงพลัง ทุ้ม หนักแน่น ทางการ</span>
      </div>
      <div class="voice-card">
        <strong>🇹🇭 บรรยายภาพยนตร์ (Movie Narrator)</strong>
        <span>เสียงบรรยายตัวอย่างหนัง ทรวดทรงประโยคสละสลวย สุขุม</span>
      </div>
      <div class="voice-card">
        <strong>🇹🇭 อัจฉรา (Achara) - หญิงรุ่นใหญ่</strong>
        <span>เสียงพากย์ตัวละครหญิงมีอายุหรือมีอำนาจ อบอุ่น นุ่มลึก</span>
      </div>
      <div class="voice-card">
        <strong>🇹🇭 ภาคภูมิ (Phakphum) - ชายดุดัน</strong>
        <span>เสียงพากย์ตัวละครชายสายดุดัน หรือตัวร้ายในภาพยนตร์แอคชั่น</span>
      </div>
      <div class="voice-card">
        <strong>🇹🇭 กานดา (Kanda) - หญิงสดใส</strong>
        <span>เสียงพากย์ตัวละครหญิงสดใส น่ารัก เหมาะกับแนวคอมเมดี้/อนิเมะ</span>
      </div>
    </div>
  </div>
</div>

<!-- Error Modal -->
<div id="errorModal" class="error-modal">
  <div class="error-modal-content">
    <h3>⚠️ เกิดข้อผิดพลาด</h3>
    <p id="errorModalMessage"></p>
    <button class="btn-close-modal" onclick="document.getElementById('errorModal').style.display='none'">ปิด (Close)</button>
  </div>
</div>

<script>
let currentVoiceMode = 'preset'; // 'preset' or 'sample'
let refAudioBase64Data = null;
let uploadedFileName = '';

function switchVoiceMode(mode) {
  currentVoiceMode = mode;
  
  document.getElementById('tabPreset').className = (mode === 'preset') ? 'tab-btn active' : 'tab-btn';
  document.getElementById('tabSample').className = (mode === 'sample') ? 'tab-btn active' : 'tab-btn';
  
  document.getElementById('panelPreset').style.display = (mode === 'preset') ? 'block' : 'none';
  document.getElementById('panelSample').style.display = (mode === 'sample') ? 'block' : 'none';
  
  const btnText = document.getElementById('btnText');
  if (mode === 'preset') {
    btnText.innerText = '🎬 เริ่มสังเคราะห์เสียงพากย์ภาพยนตร์ (Default Voice)';
  } else {
    btnText.innerText = '🧬 เริ่มโคลนนิ่งและสังเคราะห์เสียง (Voice Cloning)';
  }
}

function previewAudioFile(input) {
  if (input.files && input.files[0]) {
    const file = input.files[0];
    uploadedFileName = file.name;
    const player = document.getElementById('refAudioPreview');
    player.src = URL.createObjectURL(file);
    player.style.display = 'block';
    
    const reader = new FileReader();
    reader.onload = function(e) {
      refAudioBase64Data = e.target.result.split(',')[1];
      const badge = document.getElementById('samplingStatus');
      badge.className = 'status-badge badge-active';
      badge.innerText = '✅ พร้อมใช้งาน Zero-Shot Voice Cloning จากไฟล์: ' + uploadedFileName + ' (' + (file.size/1024).toFixed(1) + ' KB)';
      document.getElementById('btnTranscribe').style.display = 'block';
      console.log('[TTS_UI] Reference audio file loaded:', file.name);
    };
    reader.readAsDataURL(file);
  }
}

function generateAudioFromSample() {
  switchVoiceMode('sample');
  if (!refAudioBase64Data) {
    const fileInput = document.getElementById('refAudioFile');
    if (fileInput) fileInput.click();
    return;
  }
  generateAudio();
}

function insertTag(tag) {
  const ta = document.getElementById('textInput');
  ta.value += ' ' + tag;
  ta.focus();
}

function showErrorDialog(message) {
  document.getElementById('errorModalMessage').innerText = message;
  document.getElementById('errorModal').style.display = 'flex';
}

async function autoTranscribe() {
  if (!refAudioBase64Data) {
    showErrorDialog('กรุณาอัปโหลดไฟล์เสียงก่อน');
    return;
  }
  const btn = document.getElementById('btnTranscribe');
  const originalText = btn.innerText;
  btn.innerText = '⏳ กำลังถอดความ...';
  btn.disabled = true;

  try {
    const res = await fetch('/v1/transcribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Post-Processing-Token': 'dev-internal-token-change-in-production-32bytes'
      },
      body: JSON.stringify({ audioBase64: refAudioBase64Data })
    });
    const data = await res.json();
    if (res.ok && data.text) {
      document.getElementById('refTextInput').value = data.text;
    } else {
      showErrorDialog('ถอดความล้มเหลว: ' + JSON.stringify(data));
    }
  } catch (err) {
    showErrorDialog('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

async function generateAudio() {
  const text = document.getElementById('textInput').value;
  const emotion = document.getElementById('emotionSelect').value;
  const cfgStrength = parseFloat(document.getElementById('cfgRange').value);
  const speed = parseFloat(document.getElementById('speedRange').value);
  const chunkLength = parseInt(document.getElementById('chunkRange').value, 10);

  const btn = document.getElementById('btnGenerate');
  const spinner = document.getElementById('loadingSpinner');
  const btnText = document.getElementById('btnText');
  const resultCard = document.getElementById('resultCard');

  if (!text.trim()) { showErrorDialog('กรุณากรอกข้อความบทพากย์'); return; }

  const correlationId = 'corr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
  const payload = {
    text: text,
    emotion: emotion,
    cfgStrength: cfgStrength,
    speed: speed,
    chunkLength: chunkLength,
    outputFormat: 'WAV',
    correlationId: correlationId
  };

  if (currentVoiceMode === 'sample') {
    const refTextVal = document.getElementById('refTextInput').value;
    if (!refAudioBase64Data) {
      showErrorDialog('⚠️ กรุณาอัปโหลดไฟล์เสียงอ้างอิง (.wav / .mp3) ก่อนกดสร้างเสียงในโหมด Voice Cloning');
      return;
    }
    if (!refTextVal || refTextVal.trim() === "") {
      showErrorDialog('⚠️ กรุณาพิมพ์ Reference Text (ประโยคที่พูดในไฟล์เสียง) ก่อนกดสร้างเสียงในโหมด Voice Cloning');
      return;
    }
    payload.refAudioBase64 = refAudioBase64Data;
    payload.refText = refTextVal;
    console.log('[TTS_UI] Sending Zero-Shot Voice Cloning Request:', correlationId);
  } else {
    payload.voice = document.getElementById('presetVoiceSelect').value;
    console.log('[TTS_UI] Sending Default Voice Request:', payload.voice, correlationId);
  }

  btn.disabled = true; spinner.style.display = 'inline-block'; btnText.innerText = 'กำลังประมวลผล Thonburian-TTS (รองรับข้อความยาว)...';
  resultCard.style.display = 'none';

  try {
    const res = await fetch('/v1/thonburian-tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Post-Processing-Token': 'dev-internal-token-change-in-production-32bytes',
        'X-Correlation-ID': correlationId
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (res.ok && data.bytesBase64) {
      const audioPlayer = document.getElementById('audioPlayer');
      audioPlayer.src = `data:${data.mimeType};base64,${data.bytesBase64}`;
      audioPlayer.play();

      const downloadBtn = document.getElementById('downloadAudioBtn');
      if (downloadBtn) {
        downloadBtn.href = audioPlayer.src;
        downloadBtn.style.display = 'block';
      }

      document.getElementById('metaInfo').innerHTML = `
        <strong>Correlation ID:</strong> <code style="color:#a78bfa; font-size:0.9rem">${data.correlationId || correlationId}</code><br>
        <strong>Duration:</strong> ${data.durationSeconds}s &nbsp;|&nbsp; 
        <strong>Sample Rate:</strong> ${data.sampleRate} Hz &nbsp;|&nbsp; 
        <strong>CfgStrength:</strong> ${data.cfgStrength || 2.0} &nbsp;|&nbsp;
        <strong>Mode:</strong> ${data.executionMode}<br>
        <strong>Fallback Used:</strong> <span style="color:${data.fallbackUsed ? '#ef4444' : '#10b981'}; font-weight:bold">${data.fallbackUsed ? 'YES' : 'NO'}</span> &nbsp;|&nbsp;
        <strong>Output Hash:</strong> ${data.outputHash.substring(0, 16)}...
      `;
      resultCard.style.display = 'block';
    } else {
      alert('Generation Error: ' + JSON.stringify(data));
    }
  } catch (err) {
    alert('Request failed: ' + err.message);
  } finally {
    btn.disabled = false; spinner.style.display = 'none'; btnText.innerText = '🎬 สังเคราะห์เสียงพากย์ภาพยนตร์ (Generate Audio)';
  }
}
</script>
</body>
</html>"""
    return HTMLResponse(content=html_content, status_code=200)


@router.post("/v1/expressive-tts", response_class=JSONResponse)
@router.post("/v1/thonburian-tts", response_class=JSONResponse)
async def post_expressive_tts(
    request: Request,
    x_post_processing_token: Optional[str] = Header(None)
):
    verify_internal_token(request, x_post_processing_token)
    start_time = time.time()
    telemetry_manager.record_request_start()

    app_state = request.app.state
    config = app_state.config
    tts_policy = getattr(config, "expressiveTts", None) or config.policy

    try:
        body = await request.json()
    except Exception:
        telemetry_manager.record_request_failure()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "invalid_json", "message": "Request body must be valid JSON."}}
        )

    text = body.get("text")
    if not text or not isinstance(text, str):
        telemetry_manager.record_request_failure()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "missing_text", "message": "Field 'text' is required."}}
        )

    voice_seed = body.get("voiceSeed", 42)
    voice = body.get("voice", None)
    ref_audio_b64 = body.get("refAudioBase64", None)
    ref_text = body.get("refText", None)
    cfg_strength = float(body.get("cfgStrength", 2.0))
    emotion = body.get("emotion", "neutral")
    speed = float(body.get("speed", 1.0))
    temperature = float(body.get("temperature", 0.3))
    output_format = body.get("outputFormat", "WAV")
    
    chunk_length = body.get("chunkLength")
    if chunk_length is not None:
        try:
            chunk_length = int(chunk_length)
        except ValueError:
            chunk_length = None

    header_corr_id = request.headers.get("X-Correlation-ID") or request.headers.get("x-correlation-id")
    correlation_id = header_corr_id or body.get("correlationId") or f"corr_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"

    try:
        logger.info(
            f"[HTTP_POST /v1/thonburian-tts] [CorrelationID: {correlation_id}] TextLength={len(text)}, "
            f"Voice='{voice}', HasRefAudio={bool(ref_audio_b64)}, Emotion='{emotion}', CfgStrength={cfg_strength}"
        )
        result = expressive_tts_manager.process(
            text=text,
            voice_seed=voice_seed,
            voice=voice,
            ref_audio_b64=ref_audio_b64,
            ref_text=ref_text,
            cfg_strength=cfg_strength,
            emotion=emotion,
            speed=speed,
            temperature=temperature,
            output_format=output_format,
            correlation_id=correlation_id,
            policy=tts_policy,
            chunk_length=chunk_length
        )

        duration_ms = (time.time() - start_time) * 1000
        telemetry_manager.record_request_success(duration_ms)
        logger.info(
            f"[HTTP_200 /v1/thonburian-tts] [CorrelationID: {correlation_id}] Completed in {duration_ms:.2f}ms: "
            f"Duration={result['durationSeconds']}s, Mode={result['executionMode']}"
        )
        clean_result = {k: v for k, v in result.items() if k != "bytes"}
        response = JSONResponse(status_code=200, content=clean_result)
        response.headers["X-Correlation-ID"] = correlation_id
        return response

    except HTTPException_Like as ex:
        telemetry_manager.record_request_failure()
        raise HTTPException(
            status_code=ex.status_code,
            detail={"error": {"code": ex.code, "message": ex.message}}
        )
    except Exception as e:
        telemetry_manager.record_request_failure()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "tts_processing_failed", "message": str(e)}}
        )


# 8. Async Job Protocol Endpoints

@router.post("/v1/jobs", response_class=JSONResponse, status_code=202)
async def post_create_job(
    request: Request,
    x_post_processing_token: Optional[str] = Header(None),
    x_idempotency_key: Optional[str] = Header(None),
    x_trace_id: Optional[str] = Header(None)
):
    verify_internal_token(request, x_post_processing_token)
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "invalid_json", "message": "Request body must be valid JSON."}}
        )

    operation = body.get("operation")
    ALLOWED_OPERATIONS = (
        "image.faceless_previs", "faceless_previs",
        "image.face_landmarks", "face_landmarks",
        "image.upscale", "image_upscale", "upscale",
        "image.enhance", "image_enhance", "enhance"
    )
    if not operation or operation not in ALLOWED_OPERATIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "invalid_operation", "message": f"Operation '{operation}' is not supported."}}
        )

    input_b64 = body.get("inputBase64")
    if not input_b64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "missing_input", "message": "Request must contain 'inputBase64'."}}
        )

    try:
        import base64
        input_bytes = base64.b64decode(input_b64)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "invalid_base64", "message": "inputBase64 could not be decoded."}}
        )

    options = body.get("options", {})
    idempotency_key = x_idempotency_key or body.get("idempotencyKey")
    trace_id = x_trace_id or body.get("traceId")

    job_info = await job_queue_manager.create_job(
        operation=operation,
        input_bytes=input_bytes,
        options=options,
        idempotency_key=idempotency_key,
        trace_id=trace_id,
        app_state=request.app.state
    )

    return JSONResponse(status_code=status.HTTP_202_ACCEPTED, content=job_info)


@router.get("/v1/jobs/{job_id}", response_class=JSONResponse)
async def get_job_status(
    job_id: str,
    request: Request,
    x_post_processing_token: Optional[str] = Header(None)
):
    verify_internal_token(request, x_post_processing_token)
    job = await job_queue_manager.get_job_status(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "job_not_found", "message": f"Job '{job_id}' was not found."}}
        )
    return JSONResponse(status_code=200, content=job)


@router.get("/v1/jobs/{job_id}/result", response_class=JSONResponse)
async def get_job_result(
    job_id: str,
    request: Request,
    x_post_processing_token: Optional[str] = Header(None)
):
    verify_internal_token(request, x_post_processing_token)
    result = await job_queue_manager.get_job_result(job_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "job_not_found", "message": f"Job '{job_id}' was not found."}}
        )
    if "error" in result and result.get("status") != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": result["error"]}
        )
    clean_result = {k: v for k, v in result.items() if k != "bytes"}
    return JSONResponse(status_code=200, content=clean_result)


@router.delete("/v1/jobs/{job_id}", response_class=JSONResponse)
async def delete_cancel_job(
    job_id: str,
    request: Request,
    x_post_processing_token: Optional[str] = Header(None)
):
    verify_internal_token(request, x_post_processing_token)
    cancel_res = await job_queue_manager.cancel_job(job_id)
    if not cancel_res:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": {"code": "job_not_found", "message": f"Job '{job_id}' was not found."}}
        )
    return JSONResponse(status_code=200, content=cancel_res)


# 11. Video Processing Endpoints (P3)
@router.post("/v1/video/interpolate", response_class=JSONResponse)
async def post_video_interpolate(
    request: Request,
    x_post_processing_token: Optional[str] = Header(None)
):
    verify_internal_token(request, x_post_processing_token)
    try:
        body = await request.json()
    except Exception:
        body = {}

    import base64
    video_b64 = body.get("bytesBase64") or body.get("videoBase64")
    if not video_b64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "missing_video_payload", "message": "Field 'bytesBase64' is required."}}
        )

    try:
        video_bytes = base64.b64decode(video_b64)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "invalid_base64_payload", "message": "Could not decode base64 video payload."}}
        )

    target_fps = int(body.get("targetFps", 30))
    codec = body.get("outputCodec", "h264")
    preserve_audio = bool(body.get("preserveAudio", True))

    try:
        result = video_processing_manager.process_interpolation(
            video_bytes=video_bytes,
            target_fps=target_fps,
            output_codec=codec,
            preserve_audio=preserve_audio,
            policy=request.app.state.config.policy
        )
        return JSONResponse(status_code=200, content=result)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "video_interpolation_invalid", "message": str(ve)}}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "video_interpolation_error", "message": str(e)}}
        )


@router.post("/v1/video/enhance", response_class=JSONResponse)
async def post_video_enhance(
    request: Request,
    x_post_processing_token: Optional[str] = Header(None)
):
    verify_internal_token(request, x_post_processing_token)
    try:
        body = await request.json()
    except Exception:
        body = {}

    import base64
    video_b64 = body.get("bytesBase64") or body.get("videoBase64")
    if not video_b64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "missing_video_payload", "message": "Field 'bytesBase64' is required."}}
        )

    try:
        video_bytes = base64.b64decode(video_b64)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "invalid_base64_payload", "message": "Could not decode base64 video payload."}}
        )

    denoise = float(body.get("denoiseLevel", 0.5))
    sharpen = float(body.get("sharpenLevel", 0.5))

    try:
        result = video_processing_manager.process_enhancement(
            video_bytes=video_bytes,
            denoise_level=denoise,
            sharpen_level=sharpen,
            policy=request.app.state.config.policy
        )
        return JSONResponse(status_code=200, content=result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "video_enhance_error", "message": str(e)}}
        )


# 12. Audio Analysis Endpoints (P4)
@router.post("/v1/audio/transcribe", response_class=JSONResponse)
async def post_audio_transcribe(
    request: Request,
    x_post_processing_token: Optional[str] = Header(None)
):
    verify_internal_token(request, x_post_processing_token)
    try:
        body = await request.json()
    except Exception:
        body = {}

    import base64
    audio_b64 = body.get("bytesBase64") or body.get("audioBase64")
    if not audio_b64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "missing_audio_payload", "message": "Field 'bytesBase64' is required."}}
        )

    try:
        audio_bytes = base64.b64decode(audio_b64)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "invalid_base64_payload", "message": "Could not decode base64 audio payload."}}
        )

    lang = body.get("language", "th")
    detect = bool(body.get("detectLanguage", True))

    try:
        result = audio_analysis_manager.process_transcription(
            audio_bytes=audio_bytes,
            language=lang,
            detect_language=detect,
            policy=request.app.state.config.policy
        )
        return JSONResponse(status_code=200, content=result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "audio_transcribe_error", "message": str(e)}}
        )


@router.post("/v1/audio/diarize", response_class=JSONResponse)
async def post_audio_diarize(
    request: Request,
    x_post_processing_token: Optional[str] = Header(None)
):
    verify_internal_token(request, x_post_processing_token)
    try:
        body = await request.json()
    except Exception:
        body = {}

    import base64
    audio_b64 = body.get("bytesBase64") or body.get("audioBase64")
    if not audio_b64:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "missing_audio_payload", "message": "Field 'bytesBase64' is required."}}
        )

    try:
        audio_bytes = base64.b64decode(audio_b64)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "invalid_base64_payload", "message": "Could not decode base64 audio payload."}}
        )

    max_spk = int(body.get("maxSpeakers", 4))

    try:
        result = audio_analysis_manager.process_diarization(
            audio_bytes=audio_bytes,
            max_speakers=max_spk,
            policy=request.app.state.config.policy
        )
        return JSONResponse(status_code=200, content=result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "audio_diarize_error", "message": str(e)}}
        )


def verify_internal_token(request: Request, token_header: Optional[str]):
    expected_token = request.app.state.config.runtime.internalToken
    if not token_header or not hmac.compare_digest(token_header, expected_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "unauthorized", "message": "Internal service authentication required."}}
        )
