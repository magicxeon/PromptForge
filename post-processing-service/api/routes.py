import hashlib
import hmac
import logging
import time
import uuid
import importlib.util
from pathlib import Path
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
from adapters.openvoice_conversion_adapter import OpenVoiceConversionAdapter

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

    dialogue = config.dialoguePoc
    tts_ready = (importlib.util.find_spec("f5_tts") is not None
                 and (Path(config.expressiveTts.modelPath) / "mega_f5_last.safetensors").is_file()
                 and (Path(config.expressiveTts.modelPath) / "mega_vocab.txt").is_file())
    converter_ready = OpenVoiceConversionAdapter(dialogue).ready()
    ops["audio.dialogue_repair"] = {"available": dialogue.enabled and tts_ready,
        "reason": None if dialogue.enabled and tts_ready else "pilot_disabled" if not dialogue.enabled else "thai_tts_unavailable",
        "policyVersion": "dialogue-poc-v1", "maxBytes": dialogue.maxInputBytes,
        "qualified": False}
    ops["audio.voice_conversion"] = {"available": dialogue.enabled and converter_ready,
        "reason": None if dialogue.enabled and converter_ready else "pilot_disabled" if not dialogue.enabled else "openvoice_unavailable",
        "policyVersion": "dialogue-poc-v1", "maxBytes": dialogue.maxInputBytes,
        "qualified": False}

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
    import os
    template_path = os.path.join(os.path.dirname(__file__), "..", "templates", "tts_playground.html")
    with open(template_path, "r", encoding="utf-8") as f:
        html_content = f.read()
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

    if not isinstance(body, dict):
        raise HTTPException(status_code=400, detail={"error": {"code": "invalid_json", "message": "Request body must be a JSON object."}})

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
            
    model_id = body.get("modelId", "thonburian")

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
            chunk_length=chunk_length,
            model_id=model_id
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

    if not isinstance(body, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "invalid_json", "message": "Request body must be a JSON object."}}
        )
    operation = body.get("operation")
    if operation in ("audio.dialogue_repair", "audio.voice_conversion"):
        from api.dialogue_routes import create_dialogue_job
        result = await create_dialogue_job(request, body, x_post_processing_token,
                                           x_idempotency_key or body.get("idempotencyKey"), x_trace_id or body.get("traceId"))
        return JSONResponse(status_code=202, content=result)
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
