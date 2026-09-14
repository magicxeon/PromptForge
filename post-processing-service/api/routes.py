import hashlib
import hmac
import time
from typing import Optional
from fastapi import APIRouter, Request, Header, HTTPException, Response, status
from fastapi.responses import JSONResponse

from domain.faceless_previs import create_faceless_previs, HTTPException_Like
from domain.face_landmarks import detect_face_landmarks
from domain.telemetry import telemetry_tracker

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
    
    available = detector.unavailable_reason is None
    reason = detector.unavailable_reason
    model_hash = policy.model.sha256 if available else None
    
    return {
        "apiVersion": "1",
        "operations": {
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
    }

# 3. Telemetry Metrics Endpoint
@router.get("/v1/metrics", response_class=JSONResponse)
def get_metrics(request: Request, x_post_processing_token: Optional[str] = Header(None)):
    verify_internal_token(request, x_post_processing_token)
    detector = request.app.state.detector
    available = detector.unavailable_reason is None
    return telemetry_tracker.get_metrics(detector_available=available)

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
    telemetry_tracker.record_request_start()

    app_state = request.app.state
    config = app_state.config
    detector = app_state.detector
    policy = config.policy

    if detector.unavailable_reason:
        telemetry_tracker.record_request_failure()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": {"code": "face_model_unavailable", "message": "The face model is unavailable."}}
        )

    try:
        bytes_data = await request.body()
        if len(bytes_data) > policy.maxInputBytes:
            telemetry_tracker.record_request_failure()
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "faceless_input_size_invalid", "message": "Image exceeds the supported size."}}
            )

        actual_hash = hashlib.sha256(bytes_data).hexdigest()
        if x_input_sha256 != actual_hash:
            telemetry_tracker.record_request_failure()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "input_hash_mismatch", "message": "Input hash did not match."}}
            )

        if x_expected_faces is None:
            telemetry_tracker.record_request_failure()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "faceless_expected_faces_invalid", "message": f"Expected visible face count must be 1 to {policy.maxFaces}."}}
            )

        result = create_faceless_previs(
            bytes_data=bytes_data,
            detector=detector,
            expected_faces=x_expected_faces,
            policy=policy
        )

        duration_ms = (time.time() - start_time) * 1000
        telemetry_tracker.record_request_success(duration_ms)
        return JSONResponse(status_code=200, content=result)

    except HTTPException_Like as ex:
        telemetry_tracker.record_request_failure()
        raise HTTPException(
            status_code=ex.status_code,
            detail={"error": {"code": ex.code, "message": ex.message}}
        )
    except HTTPException:
        raise
    except Exception as e:
        telemetry_tracker.record_request_failure()
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
    telemetry_tracker.record_request_start()

    app_state = request.app.state
    config = app_state.config
    detector = app_state.detector
    policy = config.policy

    if detector.unavailable_reason:
        telemetry_tracker.record_request_failure()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"error": {"code": "face_model_unavailable", "message": "The face model is unavailable."}}
        )

    try:
        bytes_data = await request.body()
        if len(bytes_data) > policy.maxInputBytes:
            telemetry_tracker.record_request_failure()
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail={"error": {"code": "faceless_input_size_invalid", "message": "Image exceeds the supported size."}}
            )

        actual_hash = hashlib.sha256(bytes_data).hexdigest()
        if x_input_sha256 != actual_hash:
            telemetry_tracker.record_request_failure()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": {"code": "input_hash_mismatch", "message": "Input hash did not match."}}
            )

        result = detect_face_landmarks(
            bytes_data=bytes_data,
            detector=detector,
            expected_faces=x_expected_faces,
            policy=policy
        )

        duration_ms = (time.time() - start_time) * 1000
        telemetry_tracker.record_request_success(duration_ms)
        return JSONResponse(status_code=200, content=result)

    except HTTPException_Like as ex:
        telemetry_tracker.record_request_failure()
        raise HTTPException(
            status_code=ex.status_code,
            detail={"error": {"code": ex.code, "message": ex.message}}
        )
    except HTTPException:
        raise
    except Exception as e:
        telemetry_tracker.record_request_failure()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "faceless_processing_failed", "message": str(e)}}
        )

def verify_internal_token(request: Request, token_header: Optional[str]):
    expected_token = request.app.state.config.runtime.internalToken
    if not token_header or not hmac.compare_digest(token_header, expected_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "unauthorized", "message": "Internal service authentication required."}}
        )
