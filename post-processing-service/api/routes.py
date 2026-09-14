import hashlib
import hmac
import time
from typing import Optional
from fastapi import APIRouter, Request, Header, HTTPException, Response, status
from fastapi.responses import JSONResponse

from domain.faceless_previs import FacelessPrevisManager, faceless_previs_manager, HTTPException_Like
from domain.face_landmarks import FaceLandmarksManager, face_landmarks_manager
from domain.telemetry_manager import TelemetryManager, telemetry_manager
from domain.job_queue import job_queue_manager

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

# 6. Async Job Protocol Endpoints

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
    if not operation or operation not in ("image.faceless_previs", "faceless_previs", "image.face_landmarks", "face_landmarks"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "invalid_operation", "message": "Operation must be 'image.faceless_previs' or 'image.face_landmarks'."}}
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
    return JSONResponse(status_code=200, content=result)


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


def verify_internal_token(request: Request, token_header: Optional[str]):
    expected_token = request.app.state.config.runtime.internalToken
    if not token_header or not hmac.compare_digest(token_header, expected_token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "unauthorized", "message": "Internal service authentication required."}}
        )
