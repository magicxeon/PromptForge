import os
import re
import sys
import subprocess
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVICE_ROOT))

from config.service_config import load_post_processing_config, D_APPLICATIONS_ROOT

DEFAULT_TOKEN = "dev-internal-token-change-in-production-32bytes"

def free_port(port: int):
    if sys.platform == "win32":
        try:
            result = subprocess.run(
                ["netstat", "-ano", "-p", "tcp"],
                capture_output=True, text=True, check=False
            )
            if result.returncode == 0 and result.stdout:
                lines = result.stdout.splitlines()
                regex = re.compile(rf"TCP\s+\S+:{port}\s+\S+\s+LISTENING\s+(\d+)", re.IGNORECASE)
                pids = set()
                current_pid = os.getpid()
                for line in lines:
                    match = regex.search(line.strip())
                    if match and match.group(1) and int(match.group(1)) != current_pid:
                        pids.add(match.group(1))
                for pid in pids:
                    print(f"Port {port} is in use by process PID {pid}. Terminating process...")
                    subprocess.run(["taskkill", "/PID", pid, "/T", "/F"], capture_output=True, check=False)
        except Exception:
            pass

def main():
    os.environ["POST_PROCESSING_PILOT_ENABLED"] = os.environ.get("POST_PROCESSING_PILOT_ENABLED", "true")
    os.environ["POST_PROCESSING_INTERNAL_TOKEN"] = os.environ.get("POST_PROCESSING_INTERNAL_TOKEN", DEFAULT_TOKEN)

    config = load_post_processing_config()
    free_port(config.runtime.port)

    print("Preparing Face Landmarker model under D:\\applications...")
    try:
        from scripts.setup_model import ensure_face_model
        ensure_face_model(config)
    except Exception as e:
        print(f"Model initialization warning: {e}", file=sys.stderr)
        print("Starting service with model capabilities marked unavailable.")

    host = config.runtime.host
    port = config.runtime.port
    token = config.runtime.internalToken

    print("\n=============================================================")
    print("   Momelo Post-Processing Service (Python FastAPI Mode)")
    print("=============================================================")
    print(f"   URL:          http://{host}:{port}")
    print(f"   Swagger Docs: http://{host}:{port}/docs")
    print(f"   InternalToken:{token}")
    print(f"   Pilot Mode:   {'ENABLED' if config.runtime.pilotEnabled else 'DISABLED'}")
    print("-------------------------------------------------------------")
    print("   Available Endpoints (100% JSON Format):")
    print(f"   - GET  http://{host}:{port}/health")
    print(f"   - GET  http://{host}:{port}/v1/health")
    print(f"   - GET  http://{host}:{port}/v1/capabilities")
    print(f"   - GET  http://{host}:{port}/v1/metrics")
    print(f"   - POST http://{host}:{port}/v1/faceless-previs")
    print(f"   - POST http://{host}:{port}/v1/face-landmarks")
    print("=============================================================\n")
    print("Ready for isolated cURL / Postman / Swagger testing. Press Ctrl+C to stop.")

    import uvicorn
    uvicorn.run("main:app", host=host, port=port, log_level="info", app_dir=str(SERVICE_ROOT))

if __name__ == "__main__":
    main()
