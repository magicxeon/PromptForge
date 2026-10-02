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

class ResiliencePolicy(BaseModel):
    maxAttempts: int = 2
    backoffBaseMs: int = 500
    maxBackoffMs: int = 5000

class ImageEnhancementPolicy(BaseModel):
    policyVersion: str = "enhance-v1"
    maxInputBytes: int = 26214400
    maxPixels: int = 16000000
    maxOutputPixels: int = 64000000
    allowedScales: list[int] = [2, 4]
    defaultScale: int = 2
    processingTimeoutMs: int = 30000
    aiEngineEnabled: bool = True
    enableAntiAliasing: bool = True
    bilateralFilterRadius: int = 9
    unsharpMaskRadius: int = 2
    unsharpMaskPercent: int = 150
    unsharpMaskThreshold: int = 3
    model: Optional[ModelPolicy] = None

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

class ExpressiveTtsPolicy(BaseModel):
    policyVersion: str = "thonburian-tts-v1"
    engine: str = "thonburian_tts"
    architecture: str = "f5_tts_flow_matching"
    modelPath: str = "D:/applications/momelo-post-processing/models/thonburian-tts"
    maxTextLength: int = 2000
    processingTimeoutMs: int = 30000
    defaultSampleRate: int = 24000
    defaultSpeed: float = 1.0
    defaultCfgStrength: float = 2.0
    defaultTemperature: float = 0.3
    defaultVoiceSeed: int = 42
    allowedFormats: list[str] = ["WAV", "MP3"]
    model: Optional[ModelPolicy] = None

class DialoguePocPolicy(BaseModel):
    enabled: bool = False
    maxInputBytes: int = Field(default=67108864, ge=1024, le=134217728)
    maxSourceSeconds: int = Field(default=60, ge=1, le=600)
    maxEditSeconds: int = Field(default=20, ge=1, le=60)
    maxTextLength: int = Field(default=1000, ge=1, le=4000)
    maxQueuedJobs: int = Field(default=10, ge=1, le=100)
    jobTimeoutSeconds: int = Field(default=300, ge=10, le=1800)
    retentionSeconds: int = Field(default=86400, ge=60, le=604800)
    maxStretchRatio: float = Field(default=1.1, ge=1.0, le=2.0)
    fadeMs: int = Field(default=20, ge=0, le=100)
    ffmpegPath: str = "ffmpeg"
    ffprobePath: str = "ffprobe"
    scratchRoot: str = "D:/applications/momelo-post-processing/data/dialogue-poc"
    openVoiceCheckpoint: str = "D:/development/temp/momelo-models/openvoice/checkpoints_v2/converter"
    thaiTtsModelPath: str = "D:/applications/momelo-post-processing/models/thonburian-tts"

class PolicyDocument(BaseModel):
    schemaVersion: int
    facelessPrevis: FacelessPrevisPolicy
    jobQueue: Optional[JobQueuePolicy] = None
    resilience: Optional[ResiliencePolicy] = None
    imageEnhancement: Optional[ImageEnhancementPolicy] = None
    expressiveTts: Optional[ExpressiveTtsPolicy] = None
    dialoguePoc: Optional[DialoguePocPolicy] = None

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
    resilience: ResiliencePolicy
    imageEnhancement: ImageEnhancementPolicy
    expressiveTts: ExpressiveTtsPolicy
    dialoguePoc: DialoguePocPolicy

def load_post_processing_policy(policy_path: Path = DEFAULT_POLICY_PATH) -> Tuple[FacelessPrevisPolicy, JobQueuePolicy, ResiliencePolicy, ImageEnhancementPolicy, ExpressiveTtsPolicy]:
    if not policy_path.exists():
        raise FileNotFoundError(f"Post-Processing policy file missing: {policy_path}")
    try:
        with open(policy_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        doc = PolicyDocument(**data)
        if doc.schemaVersion != 1:
            raise ValueError("Post-Processing policy schemaVersion must be 1.")
        job_queue_policy = doc.jobQueue or JobQueuePolicy()
        resilience_policy = doc.resilience or ResiliencePolicy()
        image_enhancement_policy = doc.imageEnhancement or ImageEnhancementPolicy()
        expressive_tts_policy = doc.expressiveTts or ExpressiveTtsPolicy()
        return doc.facelessPrevis, job_queue_policy, resilience_policy, image_enhancement_policy, expressive_tts_policy
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
        
    policy, job_queue_policy, resilience_policy, image_enhancement_policy, expressive_tts_policy = load_post_processing_policy(policy_path)
    expressive_tts_policy.modelPath = merged_env.get("POST_PROCESSING_THAI_MODEL_PATH", expressive_tts_policy.modelPath)
    with open(policy_path, "r", encoding="utf-8") as dialogue_file:
        dialogue_policy = DialoguePocPolicy.model_validate(json.load(dialogue_file).get("dialoguePoc", {}))
    dialogue_policy.enabled = dialogue_policy.enabled and str(merged_env.get("POST_PROCESSING_DIALOGUE_POC_ENABLED", "false")).lower() in ("true", "1", "yes")
    dialogue_policy.ffmpegPath = merged_env.get("POST_PROCESSING_FFMPEG_PATH", dialogue_policy.ffmpegPath)
    dialogue_policy.ffprobePath = merged_env.get("POST_PROCESSING_FFPROBE_PATH", dialogue_policy.ffprobePath)
    dialogue_policy.scratchRoot = merged_env.get("POST_PROCESSING_DIALOGUE_DATA_ROOT", dialogue_policy.scratchRoot)
    dialogue_policy.openVoiceCheckpoint = merged_env.get("POST_PROCESSING_OPENVOICE_CHECKPOINT", dialogue_policy.openVoiceCheckpoint)
    dialogue_policy.thaiTtsModelPath = expressive_tts_policy.modelPath
    
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
    
    return ServiceConfig(
        runtime=runtime,
        policy=policy,
        jobQueue=job_queue_policy,
        resilience=resilience_policy,
        imageEnhancement=image_enhancement_policy,
        expressiveTts=expressive_tts_policy,
        dialoguePoc=dialogue_policy
    )
