import asyncio
import base64
import json
import os
import time
import uuid
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime, timezone

from domain.faceless_previs import faceless_previs_manager, HTTPException_Like
from domain.face_landmarks import face_landmarks_manager
from domain.telemetry import telemetry_manager

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
        except Exception:
            self.jobs = {}
            self.idempotency_map = {}

    def _save_to_disk(self):
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
            pass

    async def create_job(
        self,
        operation: str,
        input_bytes: bytes,
        options: Dict[str, Any],
        idempotency_key: Optional[str] = None,
        trace_id: Optional[str] = None,
        app_state: Any = None
    ) -> Dict[str, Any]:
        async with self._lock:
            # Check idempotency deduplication
            if idempotency_key and idempotency_key in self.idempotency_map:
                existing_job_id = self.idempotency_map[idempotency_key]
                if existing_job_id in self.jobs:
                    existing = self.jobs[existing_job_id]
                    return {
                        "jobId": existing["jobId"],
                        "status": existing["status"],
                        "operation": existing["operation"],
                        "createdAt": existing["createdAt"],
                        "idempotencyKey": idempotency_key,
                        "isDuplicate": True
                    }

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
                "inputBytesBase64": base64.b64encode(input_bytes).decode("ascii"),
                "resultSummary": None,
                "fullResult": None,
                "error": None
            }

            self.jobs[job_id] = job_data
            if idempotency_key:
                self.idempotency_map[idempotency_key] = job_id
                
            self._save_to_disk()

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
            detector = app_state.detector
            policy = app_state.config.policy

            if detector.unavailable_reason:
                raise HTTPException_Like("face_model_unavailable", "The face model is unavailable.", 533)

            # Enforce job processing timeout
            if operation == "image.faceless_previs" or operation == "faceless_previs":
                expected_faces = options.get("expectedFaces", 1)
                result = await asyncio.wait_for(
                    asyncio.to_thread(
                        faceless_previs_manager.process,
                        bytes_data=input_bytes,
                        detector=detector,
                        expected_faces=expected_faces,
                        policy=policy
                    ),
                    timeout=self.job_timeout_ms / 1000.0
                )
            elif operation == "image.face_landmarks" or operation == "face_landmarks":
                expected_faces = options.get("expectedFaces")
                result = await asyncio.wait_for(
                    asyncio.to_thread(
                        face_landmarks_manager.process,
                        bytes_data=input_bytes,
                        detector=detector,
                        expected_faces=expected_faces,
                        policy=policy
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

        except asyncio.TimeoutError:
            telemetry_manager.record_request_failure()
            async with self._lock:
                if job_id in self.jobs:
                    self.jobs[job_id]["status"] = "failed"
                    self.jobs[job_id]["stage"] = "failed"
                    self.jobs[job_id]["updatedAt"] = datetime.now(timezone.utc).isoformat()
                    self.jobs[job_id]["error"] = {"code": "job_execution_timeout", "message": "Job exceeded execution deadline."}
                    self._save_to_disk()

        except HTTPException_Like as ex:
            telemetry_manager.record_request_failure()
            async with self._lock:
                if job_id in self.jobs:
                    self.jobs[job_id]["status"] = "failed"
                    self.jobs[job_id]["stage"] = "failed"
                    self.jobs[job_id]["updatedAt"] = datetime.now(timezone.utc).isoformat()
                    self.jobs[job_id]["error"] = {"code": ex.code, "message": ex.message}
                    self._save_to_disk()

        except Exception as ex:
            telemetry_manager.record_request_failure()
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
            job["stage"] = "cancelled"
            job["updatedAt"] = datetime.now(timezone.utc).isoformat()
            self._save_to_disk()
            return {
                "jobId": job_id,
                "status": "cancelled",
                "message": "Job has been cancelled."
            }

job_queue_manager = JobQueueManager()
