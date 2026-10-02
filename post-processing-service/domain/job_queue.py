import asyncio
import base64
import json
import logging
import os
import time
import uuid
import hashlib
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from domain.faceless_previs import faceless_previs_manager, HTTPException_Like
from domain.face_landmarks import face_landmarks_manager
from domain.image_enhancement_manager import image_enhancement_manager
from domain.telemetry_manager import telemetry_manager
from domain.resilience_manager import resilience_manager

logger = logging.getLogger("post_processing.job_queue")

class JobQueueManager:
    """
    Reusable Component Manager responsible for async processing jobs, state machine transitions,
    idempotency deduplication, background worker execution, atomic persistence, and TTL cleanup.
    """
    def __init__(self, data_dir: Optional[Path] = None, job_timeout_ms: int = 30000, job_ttl_seconds: int = 86400):
        self.data_dir = data_dir or Path("D:/applications/momelo-post-processing/data")
        if not self.data_dir.exists():
            try:
                self.data_dir.mkdir(parents=True, exist_ok=True)
            except Exception:
                self.data_dir = Path(__file__).resolve().parent.parent / "data"
                self.data_dir.mkdir(parents=True, exist_ok=True)
                
        self.persistence_file = self.data_dir / "jobs.json"
        self.job_timeout_ms = job_timeout_ms
        self.job_ttl_seconds = job_ttl_seconds
        
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.idempotency_map: Dict[str, str] = {}
        self._lock = asyncio.Lock()
        self._audio_semaphore = asyncio.Semaphore(1)
        self._audio_processes = {}
        
        # Load persisted jobs on initialization
        self._load_from_disk()

    def _load_from_disk(self):
        if not self.persistence_file.exists():
            return
        try:
            with open(self.persistence_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.jobs = data.get("jobs", {})
                self.idempotency_map = data.get("idempotencyMap", {})
                for item in self.jobs.values():
                    if item.get("operation", "").startswith("audio.") and item.get("status") not in ("completed", "failed", "cancelled", "expired"):
                        item["status"] = "failed"
                        item["stage"] = "failed"
                        item["error"] = {"code": "job_interrupted", "message": "Service restarted before the job finished."}
                self._save_to_disk()
        except Exception:
            self.jobs = {}
            self.idempotency_map = {}

    def _save_to_disk(self, strict=False):
        try:
            temp_file = self.persistence_file.with_suffix(".tmp")
            data = {
                "jobs": self.jobs,
                "idempotencyMap": self.idempotency_map,
                "savedAt": datetime.now(timezone.utc).isoformat()
            }
            with open(temp_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            temp_file.replace(self.persistence_file)
        except Exception:
            if strict:
                raise

    async def create_job(
        self,
        operation: str,
        input_bytes: bytes,
        options: Dict[str, Any],
        idempotency_key: Optional[str] = None,
        trace_id: Optional[str] = None,
        app_state: Any = None
    ) -> Dict[str, Any]:
        is_audio = operation in ("audio.dialogue_repair", "audio.voice_conversion")
        fingerprint = hashlib.sha256(json.dumps([operation, options], sort_keys=True, ensure_ascii=False).encode()).hexdigest() if is_audio else None
        if is_audio and not idempotency_key:
            raise HTTPException_Like("idempotency_required", "X-Idempotency-Key is required.", 400)
        async with self._lock:
            if is_audio:
                cutoff = time.time() - app_state.config.dialoguePoc.retentionSeconds
                for old_id, old_job in list(self.jobs.items()):
                    try:
                        old_time = datetime.fromisoformat(old_job["createdAt"]).timestamp()
                    except (ValueError, KeyError):
                        continue
                    if old_job.get("operation", "").startswith("audio.") and old_job.get("status") in ("completed", "failed", "cancelled", "expired") and old_time < cutoff:
                        del self.jobs[old_id]
                self.idempotency_map = {key: value for key, value in self.idempotency_map.items() if value in self.jobs}
            # Check idempotency deduplication
            if idempotency_key and idempotency_key in self.idempotency_map:
                existing_job_id = self.idempotency_map[idempotency_key]
                if existing_job_id in self.jobs:
                    existing = self.jobs[existing_job_id]
                    if is_audio and existing.get("payloadFingerprint") != fingerprint:
                        raise HTTPException_Like("idempotency_conflict", "This key belongs to a different request.", 409)
                    logger.info(f"[JOB_DEDUPLICATED] IdempotencyKey='{idempotency_key}' matches existing JobId='{existing_job_id}'")
                    return {
                        "jobId": existing["jobId"],
                        "status": existing["status"],
                        "operation": existing["operation"],
                        "createdAt": existing["createdAt"],
                        "idempotencyKey": idempotency_key,
                        "isDuplicate": True
                    }

            if is_audio and sum(item.get("status") in ("queued", "processing") and item.get("operation", "").startswith("audio.") for item in self.jobs.values()) >= app_state.config.dialoguePoc.maxQueuedJobs:
                raise HTTPException_Like("processing_busy", "Dialogue POC queue is full.", 429)
            job_id = f"job_{int(time.time())}_{uuid.uuid4().hex[:8]}"
            now_iso = datetime.now(timezone.utc).isoformat()

            job_data = {
                "jobId": job_id,
                "operation": operation,
                "status": "queued",
                "createdAt": now_iso,
                "updatedAt": now_iso,
                "progress": 0.0,
                "stage": "queued",
                "idempotencyKey": idempotency_key,
                "traceId": trace_id,
                "options": options,
                "payloadFingerprint": fingerprint,
                "inputBytesBase64": base64.b64encode(input_bytes).decode("ascii"),
                "resultSummary": None,
                "fullResult": None,
                "error": None
            }

            self.jobs[job_id] = job_data
            if idempotency_key:
                self.idempotency_map[idempotency_key] = job_id
                
            try:
                self._save_to_disk(strict=is_audio)
            except OSError:
                self.jobs.pop(job_id, None)
                if idempotency_key:
                    self.idempotency_map.pop(idempotency_key, None)
                raise HTTPException_Like("job_persistence_unavailable", "Job could not be stored.", 503)
            logger.info(f"[JOB_CREATED] JobId='{job_id}', Operation='{operation}', InputSize={len(input_bytes)} bytes")

            # Schedule background worker execution
            if app_state:
                asyncio.create_task(self._process_job_async(job_id, app_state))

            return {
                "jobId": job_id,
                "status": "queued",
                "operation": operation,
                "createdAt": now_iso,
                "idempotencyKey": idempotency_key,
                "isDuplicate": False
            }

    async def _process_job_async(self, job_id: str, app_state: Any):
        if self.jobs.get(job_id, {}).get("operation", "").startswith("audio."):
            await self._process_audio_job(job_id, app_state)
            return
        async with self._lock:
            if job_id not in self.jobs or self.jobs[job_id]["status"] == "cancelled":
                return
            self.jobs[job_id]["status"] = "processing"
            self.jobs[job_id]["stage"] = "processing"
            self.jobs[job_id]["progress"] = 0.2
            self.jobs[job_id]["updatedAt"] = datetime.now(timezone.utc).isoformat()
            self._save_to_disk()

        start_time = time.time()
        telemetry_manager.record_request_start()

        job = self.jobs.get(job_id)
        if not job:
            return

        try:
            operation = job["operation"]
            options = job.get("options", {})
            input_bytes = base64.b64decode(job["inputBytesBase64"])
            detector = getattr(app_state, "detector", None)
            policy = getattr(app_state.config, "policy", None)

            resilience = getattr(app_state.config, "resilience", None)
            max_attempts = resilience.maxAttempts if resilience else 2
            backoff_base_ms = resilience.backoffBaseMs if resilience else 500

            # Enforce job processing timeout and retry with exponential backoff
            if operation in ("image.faceless_previs", "faceless_previs"):
                if not detector or detector.unavailable_reason:
                    raise HTTPException_Like("face_model_unavailable", "The face model is unavailable.", 533)
                expected_faces = options.get("expectedFaces", 1)
                result, attempts_used = await asyncio.wait_for(
                    resilience_manager.execute_with_retry(
                        faceless_previs_manager.process,
                        bytes_data=input_bytes,
                        detector=detector,
                        expected_faces=expected_faces,
                        policy=policy,
                        max_attempts=max_attempts,
                        backoff_base_ms=backoff_base_ms
                    ),
                    timeout=self.job_timeout_ms / 1000.0
                )
            elif operation in ("image.face_landmarks", "face_landmarks"):
                if not detector or detector.unavailable_reason:
                    raise HTTPException_Like("face_model_unavailable", "The face model is unavailable.", 533)
                expected_faces = options.get("expectedFaces")
                result, attempts_used = await asyncio.wait_for(
                    resilience_manager.execute_with_retry(
                        face_landmarks_manager.process,
                        bytes_data=input_bytes,
                        detector=detector,
                        expected_faces=expected_faces,
                        policy=policy,
                        max_attempts=max_attempts,
                        backoff_base_ms=backoff_base_ms
                    ),
                    timeout=self.job_timeout_ms / 1000.0
                )
            elif operation in ("image.upscale", "image_upscale", "upscale", "image.enhance", "image_enhance", "enhance"):
                enhancement_policy = getattr(app_state.config, "imageEnhancement", None) or policy
                scale = options.get("scale", 2)
                sharpen = options.get("sharpen", True)
                restore_faces = options.get("restoreFaces", False)
                denoise = options.get("denoise", False)
                contrast_restoration = options.get("contrastRestoration", True)
                anti_aliasing = options.get("antiAliasing", True)
                use_ai_engine = options.get("useAiEngine", True)
                output_format = options.get("outputFormat", "PNG")

                result, attempts_used = await asyncio.wait_for(
                    resilience_manager.execute_with_retry(
                        image_enhancement_manager.process,
                        bytes_data=input_bytes,
                        scale=scale,
                        sharpen=sharpen,
                        restore_faces=restore_faces,
                        denoise=denoise,
                        contrast_restoration=contrast_restoration,
                        anti_aliasing=anti_aliasing,
                        use_ai_engine=use_ai_engine,
                        output_format=output_format,
                        policy=enhancement_policy,
                        max_attempts=max_attempts,
                        backoff_base_ms=backoff_base_ms
                    ),
                    timeout=self.job_timeout_ms / 1000.0
                )
            else:
                raise HTTPException_Like("unsupported_operation", f"Operation '{operation}' is not supported.", 400)

            duration_ms = (time.time() - start_time) * 1000
            telemetry_manager.record_request_success(duration_ms)

            # Build result summary (omitting huge raw bytes from summary)
            result_summary = {k: v for k, v in result.items() if k not in ("bytes", "bytesBase64")}

            async with self._lock:
                if job_id in self.jobs and self.jobs[job_id]["status"] != "cancelled":
                    self.jobs[job_id]["status"] = "completed"
                    self.jobs[job_id]["stage"] = "completed"
                    self.jobs[job_id]["progress"] = 1.0
                    self.jobs[job_id]["updatedAt"] = datetime.now(timezone.utc).isoformat()
                    self.jobs[job_id]["resultSummary"] = result_summary
                    self.jobs[job_id]["fullResult"] = result
                    self._save_to_disk()
                    logger.info(f"[JOB_COMPLETED] JobId='{job_id}', Operation='{operation}', Duration={duration_ms:.2f}ms")

        except asyncio.TimeoutError:
            telemetry_manager.record_request_failure()
            logger.error(f"[JOB_FAILED] JobId='{job_id}' timed out after {self.job_timeout_ms}ms")
            async with self._lock:
                if job_id in self.jobs:
                    self.jobs[job_id]["status"] = "failed"
                    self.jobs[job_id]["stage"] = "failed"
                    self.jobs[job_id]["updatedAt"] = datetime.now(timezone.utc).isoformat()
                    self.jobs[job_id]["error"] = {"code": "job_execution_timeout", "message": "Job exceeded execution deadline."}
                    self._save_to_disk()

        except HTTPException_Like as ex:
            telemetry_manager.record_request_failure()
            logger.error(f"[JOB_FAILED] JobId='{job_id}' failed: code='{ex.code}', message='{ex.message}'")
            async with self._lock:
                if job_id in self.jobs:
                    self.jobs[job_id]["status"] = "failed"
                    self.jobs[job_id]["stage"] = "failed"
                    self.jobs[job_id]["updatedAt"] = datetime.now(timezone.utc).isoformat()
                    self.jobs[job_id]["error"] = {"code": ex.code, "message": ex.message}
                    self._save_to_disk()

        except Exception as ex:
            telemetry_manager.record_request_failure()
            logger.error(f"[JOB_FAILED] JobId='{job_id}' unexpected exception: {ex}")
            async with self._lock:
                if job_id in self.jobs:
                    self.jobs[job_id]["status"] = "failed"
                    self.jobs[job_id]["stage"] = "failed"
                    self.jobs[job_id]["updatedAt"] = datetime.now(timezone.utc).isoformat()
                    self.jobs[job_id]["error"] = {"code": "processing_failed", "message": str(ex)}
                    self._save_to_disk()

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            job = self.jobs.get(job_id)
            if not job:
                return None
            return {
                "jobId": job["jobId"],
                "operation": job["operation"],
                "status": job["status"],
                "stage": job["stage"],
                "progress": job["progress"],
                "createdAt": job["createdAt"],
                "updatedAt": job["updatedAt"],
                "idempotencyKey": job.get("idempotencyKey"),
                "traceId": job.get("traceId"),
                "resultSummary": job.get("resultSummary"),
                "error": job.get("error")
            }

    async def audio_media_in_use(self, media_id, manager):
        async with self._lock:
            for job in self.jobs.values():
                if job.get("operation") not in ("audio.dialogue_repair", "audio.voice_conversion") or job.get("status") not in ("queued", "processing"):
                    continue
                options = job.get("options", {})
                if options.get("sourceMediaId") == media_id:
                    return True
                try:
                    profile = manager.read_profile(options.get("voiceProfileId", ""))
                except HTTPException_Like:
                    continue
                if profile["referenceMediaId"] == media_id:
                    return True
            return False

    async def adopt_audio_job(self, job_id, manager):
        async with self._lock:
            job = self.jobs.get(job_id)
            if not job or job.get("operation") not in ("audio.dialogue_repair", "audio.voice_conversion"):
                raise HTTPException_Like("job_not_found", "Dialogue job not found.", 404)
            if job["status"] != "completed":
                raise HTTPException_Like("job_not_completed", "Only completed jobs can be adopted.", 409)
            manager.read_media(job["fullResult"].get("previewMediaId") or job["fullResult"]["audioMediaId"])
            manager.read_profile(job["options"]["voiceProfileId"])
            was_adopted = job.get("adopted", False)
            job["adopted"] = True
            try:
                self._save_to_disk(strict=True)
            except OSError:
                job["adopted"] = was_adopted
                raise HTTPException_Like("job_persistence_unavailable", "Adoption could not be stored.", 503)
            return {"jobId": job_id, "adopted": True, "previewMediaId": job["fullResult"].get("previewMediaId")}

    async def export_audio_job(self, job_id, manager):
        async with self._lock:
            job = self.jobs.get(job_id)
            if not job or job.get("operation") not in ("audio.dialogue_repair", "audio.voice_conversion") or not job.get("adopted"):
                raise HTTPException_Like("job_not_adopted", "Adopt a completed result before export.", 409)
            manager.read_profile(job["options"]["voiceProfileId"])
            if job.get("exportedMediaId"):
                record, _ = manager.read_media(job["exportedMediaId"])
                return record, False
            result = job["fullResult"]
            preview_id = result.get("previewMediaId") or result["audioMediaId"]
            record, path = manager.read_media(preview_id)
            exported = manager.store_media(path.read_bytes(), record["mimeType"], result["sourceMediaId"])
            job["exportedMediaId"] = exported["mediaId"]
            try:
                self._save_to_disk(strict=True)
            except OSError:
                job.pop("exportedMediaId", None)
                manager.delete("media", exported["mediaId"])
                raise HTTPException_Like("job_persistence_unavailable", "Export could not be stored.", 503)
            return exported, True

    async def prune_expired_audio_jobs(self, retention_seconds):
        async with self._lock:
            cutoff = time.time() - retention_seconds
            removed = False
            for job_id, job in list(self.jobs.items()):
                try:
                    created = datetime.fromisoformat(job["createdAt"]).timestamp()
                except (ValueError, KeyError):
                    continue
                if (job.get("operation", "").startswith("audio.")
                        and job.get("status") in ("completed", "failed", "cancelled", "expired")
                        and created < cutoff):
                    del self.jobs[job_id]
                    removed = True
            if removed:
                self.idempotency_map = {key: value for key, value in self.idempotency_map.items() if value in self.jobs}
                self._save_to_disk()

    async def get_job_result(self, job_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            job = self.jobs.get(job_id)
            if not job:
                return None
            if job["status"] != "completed":
                return {
                    "jobId": job_id,
                    "status": job["status"],
                    "error": job.get("error") or {"code": "job_not_completed", "message": f"Job is in state '{job['status']}'."}
                }
            return job.get("fullResult")

    async def cancel_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            job = self.jobs.get(job_id)
            if not job:
                return None
            if job["status"] in ("completed", "failed", "cancelled", "expired"):
                return {
                    "jobId": job_id,
                    "status": job["status"],
                    "message": f"Job is already in terminal state '{job['status']}'."
                }
            job["status"] = "cancelled"
            process = self._audio_processes.get(job_id)
            if process and process.returncode is None:
                try:
                    process.kill()
                except ProcessLookupError:
                    pass
            job["stage"] = "cancelled"
            job["updatedAt"] = datetime.now(timezone.utc).isoformat()
            self._save_to_disk()
            return {
                "jobId": job_id,
                "status": "cancelled",
                "message": "Job has been cancelled."
            }

    async def _process_audio_job(self, job_id, app_state):
        policy = app_state.config.dialoguePoc
        acquired = False
        process = None
        try:
            await asyncio.wait_for(self._audio_semaphore.acquire(), timeout=policy.jobTimeoutSeconds)
            acquired = True
            async with self._lock:
                job = self.jobs[job_id]
                if job["status"] == "cancelled":
                    return
                job["status"] = "processing"
                job["stage"] = "processing"
                self._save_to_disk()
                command = {"operation": job["operation"], "options": job["options"]}
            process = await asyncio.create_subprocess_exec(sys.executable, "-m", "domain.dialogue_worker",
                stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
                cwd=str(Path(__file__).resolve().parent.parent))
            self._audio_processes[job_id] = process
            if self.jobs.get(job_id, {}).get("status") == "cancelled":
                process.kill()
                await process.wait()
                return
            output, _ = await asyncio.wait_for(process.communicate(json.dumps(command, ensure_ascii=False).encode()),
                                                timeout=policy.jobTimeoutSeconds)
            outcome = json.loads(output)
            if process.returncode != 0 or not isinstance(outcome, dict):
                raise ValueError("Invalid worker result")
            from domain.dialogue_poc_manager import DialoguePocManager
            manager = DialoguePocManager(policy)
            try:
                manager.read_profile(command["options"]["voiceProfileId"])
            except HTTPException_Like:
                outcome = {"error": {"code": "voice_consent_unavailable", "message": "Voice profile was revoked or expired."}}
            async with self._lock:
                job = self.jobs.get(job_id)
                if job and job["status"] != "cancelled":
                    job["status"] = "failed" if "error" in outcome else "completed"
                    job["stage"] = job["status"]
                    job["progress"] = 1.0 if job["status"] == "completed" else 0.0
                    job["resultSummary"] = outcome.get("result")
                    job["fullResult"] = outcome.get("result")
                    job["error"] = outcome.get("error")
                    job["updatedAt"] = datetime.now(timezone.utc).isoformat()
                    self._save_to_disk()
        except Exception as exc:
            if process and process.returncode is None:
                process.kill()
                await process.wait()
            async with self._lock:
                job = self.jobs.get(job_id)
                if job and job["status"] != "cancelled":
                    job["status"] = "failed"
                    job["stage"] = "failed"
                    job["error"] = {"code": "job_execution_timeout" if isinstance(exc, asyncio.TimeoutError) else "audio_processing_failed",
                                    "message": "Dialogue processing did not complete."}
                    self._save_to_disk()
        finally:
            self._audio_processes.pop(job_id, None)
            if acquired:
                self._audio_semaphore.release()

job_queue_manager = JobQueueManager()
