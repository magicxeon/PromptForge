import json
import os
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from pydantic import BaseModel, Field, field_validator
from dotenv import dotenv_values

SERVICE_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_POLICY_PATH = SERVICE_ROOT / "config" / "policy.json"
DEFAULT_ENV_PATH = SERVICE_ROOT / ".env"
D_APPLICATIONS_ROOT = Path("D:/applications/momelo-post-processing")

class MaskPolicy(BaseModel):
    fill: str
    guideStroke: str
    guideWidth: float
    guideOpacity: float
    radiusXScale: float
    radiusYScale: float
    guideHeightScale: float

class DetectorPolicy(BaseModel):
    numFaces: int
    minFaceDetectionConfidence: float
    minFacePresenceConfidence: float

class ModelPolicy(BaseModel):
    fileName: str
    sha256: str
    downloadUrl: str
    maxDownloadBytes: int
    downloadTimeoutMs: int

class JobQueuePolicy(BaseModel):
    maxQueueSize: int = 100
    jobTimeoutMs: int = 30000
    jobTtlSeconds: int = 86400
    persistenceFileName: str = "jobs.json"

class FacelessPrevisPolicy(BaseModel):
    policyVersion: str
    maxInputBytes: int
    maxPixels: int
    maxFaces: int
    maxConcurrentRequests: int
    processingTimeoutMs: int
    minFaceRadiusX: int
    minFaceRadiusY: int
    mask: MaskPolicy
    detector: DetectorPolicy
    model: ModelPolicy

class PolicyDocument(BaseModel):
    schemaVersion: int
    facelessPrevis: FacelessPrevisPolicy
    jobQueue: Optional[JobQueuePolicy] = None

class RuntimeConfig(BaseModel):
    host: str = "127.0.0.1"
    port: int = 6501
    pilotEnabled: bool = True
    internalToken: str
    modelPath: Path
    dataDir: Path = D_APPLICATIONS_ROOT / "data"

class ServiceConfig(BaseModel):
    runtime: RuntimeConfig
    policy: FacelessPrevisPolicy
    jobQueue: JobQueuePolicy

def load_post_processing_policy(policy_path: Path = DEFAULT_POLICY_PATH) -> Tuple[FacelessPrevisPolicy, JobQueuePolicy]:
    if not policy_path.exists():
        raise FileNotFoundError(f"Post-Processing policy file missing: {policy_path}")
    try:
        with open(policy_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        doc = PolicyDocument(**data)
        if doc.schemaVersion != 1:
            raise ValueError("Post-Processing policy schemaVersion must be 1.")
        job_queue_policy = doc.jobQueue or JobQueuePolicy()
        return doc.facelessPrevis, job_queue_policy
    except Exception as e:
        raise ValueError(f"Post-Processing policy is invalid: {str(e)}")

def load_post_processing_config(
    env: Optional[dict] = None,
    env_file_path: Path = DEFAULT_ENV_PATH,
    policy_path: Path = DEFAULT_POLICY_PATH
) -> ServiceConfig:
    file_env = {}
    if env_file_path.exists():
        file_env = dotenv_values(env_file_path)
    
    merged_env = {**file_env, **(os.environ if env is None else env)}
    
    pilot_str = str(merged_env.get("POST_PROCESSING_PILOT_ENABLED", "true")).lower()
    pilot_enabled = pilot_str in ("true", "1", "yes")
    
    host = merged_env.get("POST_PROCESSING_HOST", "127.0.0.1")
    if host != "127.0.0.1":
        raise ValueError("POST_PROCESSING_HOST must remain 127.0.0.1 during private pilot.")
        
    port_str = merged_env.get("POST_PROCESSING_PORT", "6501")
    try:
        port = int(port_str)
        if not (1 <= port <= 65535):
            raise ValueError()
    except ValueError:
        raise ValueError("POST_PROCESSING_PORT must be an integer from 1 to 65535.")
        
    internal_token = merged_env.get("POST_PROCESSING_INTERNAL_TOKEN", "dev-internal-token-change-in-production-32bytes")
    if not internal_token or len(internal_token.encode("utf-8")) < 32:
        raise ValueError("POST_PROCESSING_INTERNAL_TOKEN must contain at least 32 bytes.")
        
    policy, job_queue_policy = load_post_processing_policy(policy_path)
    
    # Priority for model storage: D:\applications\momelo-post-processing\models\ -> local models\
    custom_model_path = merged_env.get("POST_PROCESSING_FACE_MODEL_PATH")
    if custom_model_path:
        model_path = Path(custom_model_path).resolve()
    else:
        d_app_model = D_APPLICATIONS_ROOT / "models" / policy.model.fileName
        local_model = SERVICE_ROOT / "models" / policy.model.fileName
        if d_app_model.exists():
            model_path = d_app_model
        elif local_model.exists():
            model_path = local_model
        else:
            model_path = d_app_model

    runtime = RuntimeConfig(
        host=host,
        port=port,
        pilotEnabled=pilot_enabled,
        internalToken=internal_token,
        modelPath=model_path
    )
    
    return ServiceConfig(runtime=runtime, policy=policy, jobQueue=job_queue_policy)
