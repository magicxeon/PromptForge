import io
import time
import uuid
import base64
import tempfile
import os
import torch
import soundfile as sf
import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)

class AudioTranscriptionManager:
    """
    Manager for Automatic Speech Recognition (ASR).
    Uses biodatlab/whisper-th-medium-combined for Thai audio transcription.
    Loads lazily to avoid heavy VRAM usage if not actively used.
    """
    def __init__(self, policy: Any = None):
        self.policy = policy
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model_id = "biodatlab/whisper-th-medium-combined"
        self._processor = None
        self._model = None

    def _load_model(self):
        if self._model is None:
            logger.info(f"[ASR_INIT] Loading Whisper TH model '{self.model_id}' on device {self.device}...")
            from transformers import WhisperProcessor, WhisperForConditionalGeneration
            self._processor = WhisperProcessor.from_pretrained(self.model_id)
            self._model = WhisperForConditionalGeneration.from_pretrained(self.model_id).to(self.device)
            self._model.eval()
            logger.info("[ASR_INIT] Whisper model loaded successfully.")

    def transcribe(self, audio_bytes: bytes, correlation_id: str = None) -> Dict[str, Any]:
        """
        Transcribes the given audio bytes into Thai text.
        """
        if not audio_bytes:
            raise ValueError("No audio data provided.")

        corr_id = correlation_id or f"corr_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
        logger.info(f"[ASR_START] [CorrelationID: {corr_id}] Audio size: {len(audio_bytes)} bytes")
        
        t0 = time.time()
        self._load_model()
        
        # Load audio data
        audio_buf = io.BytesIO(audio_bytes)
        try:
            audio_samples, sample_sr = sf.read(audio_buf, dtype="float32")
        except Exception as e:
            logger.error(f"[ASR_ERROR] Failed to read audio: {e}")
            raise ValueError("Invalid audio format.")
        
        import librosa
        if audio_samples.ndim > 1:
            audio_samples = audio_samples.mean(axis=1)
            
        if sample_sr != 16000:
            audio_samples = librosa.resample(audio_samples, orig_sr=sample_sr, target_sr=16000)

        try:
            input_features = self._processor(audio_samples, sampling_rate=16000, return_tensors="pt").input_features
            input_features = input_features.to(self.device, dtype=self._model.dtype)
            
            forced_decoder_ids = self._processor.get_decoder_prompt_ids(language="th", task="transcribe")
            with torch.no_grad():
                predicted_ids = self._model.generate(input_features, forced_decoder_ids=forced_decoder_ids)
                
            text = self._processor.batch_decode(predicted_ids, skip_special_tokens=True)[0].strip()
        except Exception as e:
            logger.error(f"[ASR_ERROR] Model execution failed: {e}")
            raise e

        total_ms = (time.time() - t0) * 1000.0
        logger.info(f"[ASR_COMPLETE] [CorrelationID: {corr_id}] Text: '{text}' Latency: {total_ms:.2f}ms")
        
        return {
            "text": text,
            "duration_ms": total_ms
        }

audio_transcription_manager = AudioTranscriptionManager()
