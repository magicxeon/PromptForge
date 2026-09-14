import os
import time
from typing import Dict, Any

class TelemetryManager:
    """
    Reusable component manager responsible for service telemetry, operational metrics, and memory tracking.
    """
    def __init__(self):
        self.start_time = time.time()
        self.total_requests = 0
        self.successful_requests = 0
        self.failed_requests = 0
        self.active_pending = 0
        self.total_processing_time_ms = 0.0
        self.max_processing_time_ms = 0.0

    def record_request_start(self):
        self.total_requests += 1
        self.active_pending += 1

    def record_request_success(self, duration_ms: float):
        self.active_pending = max(0, self.active_pending - 1)
        self.successful_requests += 1
        self.total_processing_time_ms += duration_ms
        if duration_ms > self.max_processing_time_ms:
            self.max_processing_time_ms = duration_ms

    def record_request_failure(self):
        self.active_pending = max(0, self.active_pending - 1)
        self.failed_requests += 1

    def get_metrics(self, detector_available: bool) -> Dict[str, Any]:
        uptime_seconds = int(time.time() - self.start_time)
        
        try:
            import psutil
            process = psutil.Process(os.getpid())
            mem_info = process.memory_info()
            rss_bytes = mem_info.rss
            vms_bytes = mem_info.vms
        except ImportError:
            rss_bytes = 0
            vms_bytes = 0

        avg_latency = (
            round(self.total_processing_time_ms / self.successful_requests, 2)
            if self.successful_requests > 0
            else 0.0
        )

        return {
            "service": "post-processing",
            "uptimeSeconds": uptime_seconds,
            "memoryUsage": {
                "rssBytes": rss_bytes,
                "vmsBytes": vms_bytes,
                "heapTotalBytes": rss_bytes,
                "heapUsedBytes": rss_bytes
            },
            "requests": {
                "total": self.total_requests,
                "successful": self.successful_requests,
                "failed": self.failed_requests,
                "activePending": self.active_pending
            },
            "performance": {
                "avgProcessingTimeMs": avg_latency,
                "maxProcessingTimeMs": round(self.max_processing_time_ms, 2)
            },
            "capabilities": {
                "faceless_previs": detector_available,
                "face_landmarks": detector_available
            }
        }

telemetry_manager = TelemetryManager()
telemetry_tracker = telemetry_manager
