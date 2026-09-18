import io
import os
import re
import sys
import uuid
import time
import base64
import logging
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import soundfile as sf

# Ensure UTF-8 stdout encoding on Windows to prevent f5_tts print() charmap encoding crashes
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Set HuggingFace offline mode to ensure 100% local model loading without network requests
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

logger = logging.getLogger("post_processing.thonburian_tts_adapter")

SERVICE_ROOT = Path(__file__).resolve().parent.parent
D_APPLICATIONS_ROOT = Path("D:/applications/momelo-post-processing")
THONBURIAN_MODEL_DIR = D_APPLICATIONS_ROOT / "models" / "thonburian-tts"

# Pre-packaged native Thai reference voice catalog presets
THONBURIAN_VOICE_CATALOG = [
    {
        "id": "th-TH-Premwadee",
        "name": "🇹🇭 เปรมวดี (Premwadee) - เสียงพากย์หญิงใส นุ่มนวล สมจริง",
        "gender": "Female (ผู้หญิง)",
        "lang": "th-TH",
        "style": "Cinematic Movie Dubbing (นางเอก/หญิงสาว)",
        "description": "เสียงพากย์ภาพยนตร์อารมณ์ธรรมชาติ ออกเสียงวรรณยุกต์และคำควบกล้ำไทยเป๊ะ 100%"
    },
    {
        "id": "th-TH-Niwat",
        "name": "🇹🇭 นิวัฒน์ (Niwat) - เสียงพากย์ชายทุ้ม หนักแน่น ทางการ",
        "gender": "Male (ผู้ชาย)",
        "lang": "th-TH",
        "style": "Cinematic Action Dubbing (พระเอก/ชายชาตรี)",
        "description": "เสียงพากย์ตัวละครชายทรงพลัง แสดงอารมณ์ตื่นเต้น/โกรธ/ขรึมในฉากหนังได้ดี"
    },
    {
        "id": "th-TH-Narrator",
        "name": "🇹🇭 บรรยายภาพยนตร์ (Movie Narrator) - เสียงสุขุม ทรงพลัง",
        "gender": "Male (ผู้ชาย)",
        "lang": "th-TH",
        "style": "Trailer / Storytelling (เสียงพากย์บรรยายตัวอย่างหนัง)",
        "description": "เสียงบรรยายตัวอย่างหนัง ทรวดทรงประโยคสละสลวย เว้นวรรคหายใจสมจริง"
    },
    {
        "id": "th-TH-Achara",
        "name": "🇹🇭 อัจฉรา (Achara) - เสียงพากย์หญิงรุ่นใหญ่ อบอุ่น ทรงอำนาจ",
        "gender": "Female (ผู้หญิง)",
        "lang": "th-TH",
        "style": "Cinematic Drama / Royal (ผู้ใหญ่/ราชินี/อบอุ่น)",
        "description": "เสียงพากย์ตัวละครหญิงมีอายุหรือมีอำนาจ น้ำเสียงหนักแน่น นุ่มลึก"
    },
    {
        "id": "th-TH-Phakphum",
        "name": "🇹🇭 ภาคภูมิ (Phakphum) - เสียงพากย์ชายดุดัน ดราม่า เข้มข้น",
        "gender": "Male (ผู้ชาย)",
        "lang": "th-TH",
        "style": "Cinematic Thriller / Villain (ตัวร้าย/ดุดัน)",
        "description": "เสียงพากย์ตัวละครชายสายดุดัน หรือตัวร้ายในภาพยนตร์แอคชั่น-สืบสวน"
    },
    {
        "id": "th-TH-Kanda",
        "name": "🇹🇭 กานดา (Kanda) - เสียงพากย์นางเอกสดใส ร่าเริง โรแมนติก",
        "gender": "Female (ผู้หญิง)",
        "lang": "th-TH",
        "style": "Romantic Comedy / Anime (สดใส/โรแมนติก)",
        "description": "เสียงพากย์ตัวละครหญิงสดใส น่ารัก อารมณ์ร่าเริง เหมาะกับฉากโรแมนติกคอมเมดี้"
    }
]

_SHARED_F5_ENGINE = None


class ThonburianTtsAdapter:
    """
    Adapter for ThonburianTTS — a Thai-language fine-tune of F5-TTS (DiT 335M Flow-Matching).
    Loads the fine-tuned checkpoint and Thai-complete vocabulary from biodatlab/ThonburianTTS.

    Required files (run scripts/download_thonburian_model.py once to populate):
      D:/applications/momelo-post-processing/models/thonburian-tts/model_last_prune.safetensors
      D:/applications/momelo-post-processing/models/thonburian-tts/mega_vocab_ipa.txt
    """

    # Paths to the ThonburianTTS FINAL fine-tuned checkpoint (megaF5 character-based) and vocabulary
    THAI_CKPT_FILE = THONBURIAN_MODEL_DIR / "mega_f5_last.safetensors"
    THAI_VOCAB_FILE = THONBURIAN_MODEL_DIR / "mega_vocab.txt"

    def __init__(self, policy: Any):
        self.policy = policy
        self.model_dir = Path(getattr(policy, "modelPath", str(THONBURIAN_MODEL_DIR)))
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self._initialize_engine()

    def _initialize_engine(self):
        """Initializes the PyTorch F5-TTS engine with Thai fine-tuned weights and Thai vocab."""
        global _SHARED_F5_ENGINE
        self.f5_available = False
        self.torch_device = "cpu"

        import torch
        import torchaudio

        # Patch torchaudio.load to use soundfile backend on Windows (avoids broken torchcodec DLL)
        def _soundfile_load(uri, frame_offset=0, num_frames=-1, normalize=True, channels_first=True, format=None, buffer_size=4096, backend=None):
            data, sr = sf.read(uri, dtype="float32")
            if data.ndim == 1:
                tensor = torch.from_numpy(data).unsqueeze(0)
            else:
                tensor = torch.from_numpy(data.T)
            if not channels_first and tensor.ndim == 2:
                tensor = tensor.T
            return tensor, sr

        torchaudio.load = _soundfile_load

        self.cuda_available = torch.cuda.is_available()
        self.torch_device = "cuda" if self.cuda_available else "cpu"

        if _SHARED_F5_ENGINE is None:
            # Validate that the Thai fine-tuned model files are present
            missing = []
            if not self.THAI_CKPT_FILE.exists():
                missing.append(str(self.THAI_CKPT_FILE))
            if not self.THAI_VOCAB_FILE.exists():
                missing.append(str(self.THAI_VOCAB_FILE))
            if missing:
                raise FileNotFoundError(
                    f"ThonburianTTS Thai model files not found:\n"
                    + "\n".join(f"  - {p}" for p in missing)
                    + "\n\nRun the download script first:\n"
                    + "  python scripts/download_thonburian_model.py"
                )

            from f5_tts.api import F5TTS
            logger.info(
                f"[THONBURIAN_INIT] Loading Thai fine-tuned model:\n"
                f"  Checkpoint : {self.THAI_CKPT_FILE}\n"
                f"  Vocabulary : {self.THAI_VOCAB_FILE}"
            )
            _SHARED_F5_ENGINE = F5TTS(
                model="F5TTS_v1_Base",
                ckpt_file=str(self.THAI_CKPT_FILE),
                vocab_file=str(self.THAI_VOCAB_FILE),
                device=self.torch_device,
                hf_cache_dir=r"C:\Users\punya\.cache\huggingface\hub"
            )

        self.f5_engine = _SHARED_F5_ENGINE
        self.f5_available = True
        logger.info(
            f"[THONBURIAN_INIT] PyTorch={torch.__version__}, Device={self.torch_device}, "
            f"ThonburianTTS Thai F5-TTS READY (biodatlab/ThonburianTTS megaIPA)."
        )

    def synthesize(
        self,
        text: str,
        voice: Optional[str] = None,
        ref_audio_bytes: Optional[bytes] = None,
        ref_text: Optional[str] = None,
        cfg_strength: float = 2.0,
        speed: float = 1.0,
        emotion: str = "neutral",
        voice_seed: int = 42,
        output_format: str = "WAV",
        correlation_id: Optional[str] = None,
        chunk_length: Optional[int] = None
    ) -> Tuple[bytes, int, float, str, bool, bool, Optional[str]]:
        """
        Synthesizes raw text into audio speech by chunking long text and 
        processing chunks concurrently via ThreadPoolExecutor.
        """
        if not text or not text.strip():
            raise ValueError("Input text cannot be empty.")

        max_len = getattr(self.policy, "maxTextLength", 2000)
        if len(text) > max_len:
            raise ValueError(f"Input text length ({len(text)} chars) exceeds limit of {max_len} chars.")

        sample_rate = getattr(self.policy, "defaultSampleRate", 24000)
        corr_id = correlation_id or f"corr_{int(time.time()*1000)}_{uuid.uuid4().hex[:6]}"
        t0 = time.time()

        logger.info(
            f"[THONBURIAN_TTS_START] [CorrelationID: {corr_id}] TextLen={len(text)} chars, Voice='{voice or 'auto'}', "
            f"HasRefAudio={bool(ref_audio_bytes)}, CfgStrength={cfg_strength}, Speed={speed}, Emotion='{emotion}', ChunkLen={chunk_length}"
        )

        # Prepare reference audio WAV file ONCE for all chunks
        tmp_ref_path = None
        if ref_audio_bytes and len(ref_audio_bytes) > 0:
            audio_buf = io.BytesIO(ref_audio_bytes)
            audio_samples, sample_sr = sf.read(audio_buf, dtype="float32")
            if audio_samples.ndim > 1:
                audio_samples = audio_samples.mean(axis=1)  # stereo to mono
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                sf.write(tmp.name, audio_samples, sample_sr, format="WAV")
                tmp_ref_path = tmp.name
        else:
            # Handle preset voices
            if voice == "morgan_freeman":
                # F5-TTS requires .wav on Windows if ffmpeg is not installed natively (fixes WinError 2)
                tmp_ref_path = "D:/development/ModelPromptForge/post-processing-service/ref_samples/morgan-freeman.wav"
                default_ref_text = "Denzel and I were in a Joseph Papp production of Coriolanus. I was the lead"
            else:
                # Default (Jackie Chan)
                tmp_ref_path = "D:/development/ModelPromptForge/post-processing-service/ref_samples/sampling-test4.wav"
                default_ref_text = "ฉินหลงคุยกับโจวซิงฉือก็บอก 'พี่ ไปประเทศไหน พี่ก็สู้กันธรรมดา แต่มาเมืองไทยพี่ต้องฟัด ไปที่ไหน เอ็งก็เป็นคนธรรมดา แต่มาเมืองไทยเอ็งเป็นแค่คนเล็ก"

            if not os.path.exists(tmp_ref_path):
                from importlib.resources import files
                tmp_ref_path = str(files("f5_tts").joinpath("infer/examples/basic/basic_ref_en.wav"))
                default_ref_text = "Some sample reference text for voice cloning."

        final_ref_text = (ref_text and ref_text.strip()) or default_ref_text

        # ---------------- CHUNKING LOGIC ----------------
        # Use PyThaiNLP to tokenize into valid Thai words so we don't cut words in half
        try:
            from pythainlp.tokenize import word_tokenize
            raw_chunks = word_tokenize(text.strip(), engine="newmm")
        except ImportError:
            raw_chunks = re.split(r'([\n\s]+|[,.!?]+)', text.strip())

        chunks = []
        current_chunk = ""
        
        # Determine max chunk length from param, env, or default 100
        env_chunk = os.getenv("TTS_CHUNK_LENGTH", "100")
        try:
            default_chunk = int(env_chunk)
        except ValueError:
            default_chunk = 100
            
        max_chunk_length = chunk_length if chunk_length is not None else default_chunk
        logger.info(f"[THONBURIAN_TTS_CHUNKS] Using max_chunk_length={max_chunk_length}")

        for part in raw_chunks:
            if not part:
                continue
            if len(current_chunk) + len(part) <= max_chunk_length:
                current_chunk += part
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                current_chunk = part
        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        if not chunks:
            chunks = [text.strip()]

        logger.info(f"[THONBURIAN_TTS_CHUNKS] [CorrelationID: {corr_id}] Split text into {len(chunks)} chunks.")

        try:
            # Execute chunks in parallel using ThreadPoolExecutor
            # (F5-TTS is thread-safe on inference if memory allows. Using max_workers=3)
            with ThreadPoolExecutor(max_workers=3) as executor:
                futures = []
                for i, chunk_text in enumerate(chunks):
                    # Append Emotion to text if not neutral
                    final_gen_text = chunk_text
                    if emotion and emotion.lower() != "neutral":
                        # Apply emotion tag to all chunks to maintain tone consistency
                        final_gen_text = f"({emotion.capitalize()}) {chunk_text}"
                    
                    futures.append(
                        executor.submit(
                            self._run_thonburian_flow_matching,
                            final_gen_text,
                            tmp_ref_path,
                            final_ref_text,
                            cfg_strength,
                            speed,
                            voice_seed,
                            corr_id
                        )
                    )
                
                results = [f.result() for f in futures]
            
            # Combine all generated numpy arrays with a short silence gap between chunks
            audio_arrays = [r[0] for r in results]
            sample_rates = [r[1] for r in results]
            final_sr = sample_rates[0] if sample_rates else sample_rate
            
            silence_gap = np.zeros(int(final_sr * 0.25), dtype=np.float32)  # 250ms silence
            
            combined_arrays = []
            for i, arr in enumerate(audio_arrays):
                combined_arrays.append(arr)
                if i < len(audio_arrays) - 1:
                    combined_arrays.append(silence_gap)
            
            combined_audio = np.concatenate(combined_arrays, axis=0) if combined_arrays else np.array([], dtype=np.float32)
            
            # Convert combined numpy array to WAV bytes
            wav_io = io.BytesIO()
            sf.write(wav_io, combined_audio, final_sr, format="WAV")
            audio_bytes = wav_io.getvalue()
            duration = max(0.5, round(len(combined_audio) / float(final_sr), 2))

        finally:
            if ref_audio_bytes and tmp_ref_path and os.path.exists(tmp_ref_path):
                try:
                    os.remove(tmp_ref_path)
                except Exception:
                    pass

        execution_mode = f"thonburian_f5_dit_335m_{self.torch_device}_chunked"

        total_ms = (time.time() - t0) * 1000.0
        logger.info(
            f"[THONBURIAN_TTS_COMPLETE] [CorrelationID: {corr_id}] Generated={len(audio_bytes)} bytes, SampleRate={final_sr}Hz, "
            f"Duration={duration:.2f}s, Mode={execution_mode}, Latency={total_ms:.2f}ms"
        )

        return audio_bytes, final_sr, duration, execution_mode, True, False, None

    def _run_thonburian_flow_matching(
        self,
        gen_text: str,
        tmp_ref_path: str,
        ref_text: str,
        cfg_strength: float,
        speed: float,
        voice_seed: int,
        corr_id: str
    ) -> Tuple[np.ndarray, int]:
        """
        Executes canonical F5TTS.infer() for a single text chunk and returns the raw numpy array.
        """
        if self.f5_engine is None:
            from f5_tts.api import F5TTS
            self.f5_engine = F5TTS(
                device=self.torch_device,
                hf_cache_dir=r"C:\Users\punya\.cache\huggingface\hub"
            )

        logger.info(
            f"[THONBURIAN_F5_INFER_CHUNK] [CorrelationID: {corr_id}] "
            f"Executing F5TTS.infer chunk: GenText='{gen_text}', CfgStrength={cfg_strength}"
        )

        wav_out, sr_out, _ = self.f5_engine.infer(
            ref_file=tmp_ref_path,
            ref_text=ref_text,
            gen_text=gen_text,
            cfg_strength=cfg_strength,
            speed=speed,
            seed=voice_seed,
            show_info=lambda *a, **kw: None
        )
        return wav_out, sr_out

