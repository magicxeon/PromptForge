from typing import Optional

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from domain.dialogue_poc_manager import DialoguePocManager
from domain.faceless_previs import HTTPException_Like
from domain.job_queue import job_queue_manager

router = APIRouter()


def require_dialogue(request, token):
    from api.routes import verify_internal_token
    verify_internal_token(request, token)
    policy = request.app.state.config.dialoguePoc
    if not policy.enabled:
        raise HTTPException(status_code=503, detail={"error": {"code": "dialogue_poc_disabled", "message": "Dialogue POC is disabled."}})
    return DialoguePocManager(policy)


def dialogue_error(error):
    return HTTPException(status_code=error.status_code, detail={"error": {"code": error.code, "message": error.message}})


async def create_dialogue_job(request, body, token, idempotency_key, trace_id):
    manager = require_dialogue(request, token)
    try:
        operation, options = manager.validate_job(body)
        if not isinstance(idempotency_key, str) or not 1 <= len(idempotency_key) <= 128:
            raise HTTPException_Like("idempotency_required", "X-Idempotency-Key is required.", 400)
        return await job_queue_manager.create_job(operation, b"", options,
                                                   idempotency_key=idempotency_key,
                                                   trace_id=trace_id, app_state=request.app.state)
    except HTTPException_Like as error:
        raise dialogue_error(error)


@router.post("/v1/media", response_class=JSONResponse, status_code=201)
async def upload_media(request: Request, x_post_processing_token: Optional[str] = Header(None)):
    manager = require_dialogue(request, x_post_processing_token)
    mime_type = request.headers.get("content-type", "").split(";", 1)[0].lower()
    chunks = bytearray()
    async for chunk in request.stream():
        chunks.extend(chunk)
        if len(chunks) > manager.policy.maxInputBytes:
            raise dialogue_error(HTTPException_Like("media_input_invalid", "Upload exceeds the POC limit.", 413))
    try:
        return JSONResponse(status_code=201, content=manager.store_media(bytes(chunks), mime_type))
    except HTTPException_Like as error:
        raise dialogue_error(error)


@router.get("/v1/media/{media_id}", response_class=JSONResponse)
def get_media(media_id: str, request: Request, x_post_processing_token: Optional[str] = Header(None)):
    manager = require_dialogue(request, x_post_processing_token)
    try:
        return manager.media_result(media_id)
    except HTTPException_Like as error:
        raise dialogue_error(error)


@router.delete("/v1/media/{media_id}", response_class=JSONResponse)
async def delete_media(media_id: str, request: Request, x_post_processing_token: Optional[str] = Header(None)):
    manager = require_dialogue(request, x_post_processing_token)
    try:
        if await job_queue_manager.audio_media_in_use(media_id, manager):
            raise HTTPException_Like("media_in_use", "An active job uses this media.", 409)
        return manager.delete("media", media_id)
    except HTTPException_Like as error:
        raise dialogue_error(error)


@router.post("/v1/voice-profiles", response_class=JSONResponse, status_code=201)
async def create_voice_profile(request: Request, x_post_processing_token: Optional[str] = Header(None)):
    manager = require_dialogue(request, x_post_processing_token)
    try:
        body = await request.json()
        if not isinstance(body, dict):
            raise ValueError("Expected object")
        record = manager.create_profile(body.get("referenceMediaId"), body.get("startMs"), body.get("endMs"),
                                        body.get("consentRecordId"), body.get("referenceTranscript"))
        return JSONResponse(status_code=201, content=record)
    except (ValueError, AttributeError):
        raise dialogue_error(HTTPException_Like("profile_input_invalid", "Invalid profile request.", 422))
    except HTTPException_Like as error:
        raise dialogue_error(error)


@router.get("/v1/voice-profiles/{profile_id}", response_class=JSONResponse)
def get_voice_profile(profile_id: str, request: Request, x_post_processing_token: Optional[str] = Header(None)):
    manager = require_dialogue(request, x_post_processing_token)
    try:
        record = manager.read_profile(profile_id)
        return {key: value for key, value in record.items() if key != "referenceTranscript"}
    except HTTPException_Like as error:
        raise dialogue_error(error)


@router.delete("/v1/voice-profiles/{profile_id}", response_class=JSONResponse)
def delete_voice_profile(profile_id: str, request: Request, x_post_processing_token: Optional[str] = Header(None)):
    manager = require_dialogue(request, x_post_processing_token)
    try:
        return manager.delete("profile", profile_id)
    except HTTPException_Like as error:
        raise dialogue_error(error)


@router.post("/v1/jobs/{job_id}/adoption", response_class=JSONResponse)
async def adopt_dialogue_job(job_id: str, request: Request, x_post_processing_token: Optional[str] = Header(None)):
    manager = require_dialogue(request, x_post_processing_token)
    try:
        return await job_queue_manager.adopt_audio_job(job_id, manager)
    except HTTPException_Like as error:
        raise dialogue_error(error)


@router.post("/v1/jobs/{job_id}/export", response_class=JSONResponse, status_code=201)
async def export_dialogue_job(job_id: str, request: Request, x_post_processing_token: Optional[str] = Header(None)):
    manager = require_dialogue(request, x_post_processing_token)
    try:
        record, created = await job_queue_manager.export_audio_job(job_id, manager)
        return JSONResponse(status_code=201 if created else 200, content=record)
    except HTTPException_Like as error:
        raise dialogue_error(error)
