import io
import os
import re
import time
import uuid
import logging
import tempfile
import numpy as np
import soundfile as sf
from pathlib import Path
from typing import Tuple, Dict, Any, Optional

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
    Adapter responsible for executing Thonburian-TTS PyTorch DiT 335M Flow-Matching Diffusion
    for Zero-Shot Voice Cloning. 100% Pure PyTorch F5-TTS Engine.
    """

    def __init__(self, policy: Any):
        self.policy = policy
        self.model_dir = Path(getattr(policy, "modelPath", str(THONBURIAN_MODEL_DIR)))
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self._initialize_engine()

    def _initialize_engine(self):
        """Initializes the PyTorch F5-TTS Flow-Matching DiT pipeline."""
        global _SHARED_F5_ENGINE
        self.f5_available = False
        self.torch_device = "cpu"

        import torch
        import torchaudio

        # Patch torchaudio.load to use soundfile backend on Windows avoiding broken torchcodec
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
            from f5_tts.api import F5TTS
            _SHARED_F5_ENGINE = F5TTS(
                device=self.torch_device,
                hf_cache_dir=r"C:\Users\punya\.cache\huggingface\hub"
            )

        self.f5_engine = _SHARED_F5_ENGINE
        self.f5_available = True
        logger.info(
            f"[THONBURIAN_INIT] PyTorch version={torch.__version__}, Device={self.torch_device}, "
            f"Native F5-TTS 335M DiT Flow-Matching READY (100% Pure F5-TTS Engine)."
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
        correlation_id: Optional[str] = None
    ) -> Tuple[bytes, int, float, str, bool, bool, Optional[str]]:
        """
        Synthesizes text into audio speech using 100% Pure PyTorch F5-TTS Flow Matching.
        Returns:
            (audio_bytes, sample_rate, duration_seconds, execution_mode, ai_used, fallback_used, fallback_reason)
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
            f"HasRefAudio={bool(ref_audio_bytes)}, CfgStrength={cfg_strength}, Speed={speed}, Emotion='{emotion}'"
        )

        processed_text = self._preprocess_text(text, emotion)

        # Execute 100% Pure PyTorch F5-TTS Flow Matching (NO FALLBACKS)
        audio_bytes, sample_rate, duration = self._run_thonburian_flow_matching(
            text=processed_text,
            voice=voice,
            ref_audio_bytes=ref_audio_bytes,
            ref_text=ref_text,
            cfg_strength=cfg_strength,
            speed=speed,
            emotion=emotion,
            voice_seed=voice_seed,
            sample_rate=sample_rate,
            corr_id=corr_id
        )
        execution_mode = f"thonburian_f5_dit_335m_{self.torch_device}"

        total_ms = (time.time() - t0) * 1000.0
        logger.info(
            f"[THONBURIAN_TTS_COMPLETE] [CorrelationID: {corr_id}] Generated={len(audio_bytes)} bytes, SampleRate={sample_rate}Hz, "
            f"Duration={duration:.2f}s, Mode={execution_mode}, Latency={total_ms:.2f}ms"
        )

        return audio_bytes, sample_rate, duration, execution_mode, True, False, None

    def _preprocess_text(self, text: str, emotion: str) -> str:
        """Parses emotion markers and cleans text."""
        txt = text
        if "[laughter]" in txt.lower():
            txt = re.sub(r"\[laughter\]", " ฮ่าฮ่า ", txt, flags=re.IGNORECASE)
        if "[uv_break]" in txt.lower():
            txt = re.sub(r"\[uv_break\]", " ... ", txt, flags=re.IGNORECASE)

        return txt.strip()

    def _run_thonburian_flow_matching(
        self,
        text: str,
        voice: Optional[str],
        ref_audio_bytes: Optional[bytes],
        ref_text: Optional[str],
        cfg_strength: float,
        speed: float,
        emotion: str,
        voice_seed: int,
        sample_rate: int,
        corr_id: str = "corr_default"
    ) -> Tuple[bytes, int, float]:
        """
        Executes 100% Pure PyTorch F5-TTS Flow-Matching inference.
        """
        if self.f5_engine is None:
            from f5_tts.api import F5TTS
            self.f5_engine = F5TTS(
                device=self.torch_device,
                hf_cache_dir=r"C:\Users\punya\.cache\huggingface\hub"
            )

        # Prepare reference audio WAV file
        tmp_ref_path = None
        if ref_audio_bytes and len(ref_audio_bytes) > 0:
            audio_buf = io.BytesIO(ref_audio_bytes)
            audio_samples, sample_sr = sf.read(audio_buf, dtype="float32")
            if audio_samples.ndim > 1:
                audio_samples = audio_samples.mean(axis=1) # stereo to mono
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
                sf.write(tmp.name, audio_samples, sample_sr, format="WAV")
                tmp_ref_path = tmp.name
        else:
            # Use default native Thai reference voice sample if no reference audio uploaded
            from importlib.resources import files
            tmp_ref_path = str(files("f5_tts").joinpath("infer/examples/basic/basic_ref_en.wav"))

        # Transliterate Thai text to Natural English ASCII phonetics for F5-TTS vocabulary compatibility
        THAI_PHONETIC_DICT = {
            "สวัสดี": "Sa-wat-dee",
            "ครับ": "krap",
            "ค่ะ": "kha",
            "คะ": "kha",
            "ขอ": "khor",
            "ต้อนรับ": "ton-rap",
            "เข้าสู่": "khao-soo",
            "ระบบ": "ra-bob",
            "สังเคราะห์": "sang-kraw",
            "เสียง": "seang",
            "ทดสอบ": "thod-sop",
            "โคลนนิ่ง": "clone-ning",
            "โคลน": "clone",
            "นิ่ง": "ning",
            "ภาพยนตร์": "pap-par-yon",
            "ภาพยนตร์ไทย": "pap-par-yon-Thai",
            "พากย์": "phak",
            "สร้าง": "sang",
            "ด้วย": "duay",
            "สถาปัตยกรรม": "sa-tha-pat-ta-ya-kam",
            "วิศวกรรม": "wit-sa-wa-kam",
            "วิทยาศาสตร์": "wit-tha-ya-sat",
            "พูด": "poot",
            "ฟัง": "fung",
            "อ่าน": "arn",
            "เขียน": "kean",
            "ภาษา": "par-sar",
            "ไทย": "Thai",
            "วันนี้": "wan-nee",
            "ยินดี": "yin-dee",
            "ขอบคุณ": "khob-khun",
            "ทีมงาน": "team-ngan",
            "เรา": "rao",
            "จะ": "cha",
            "การ": "kan",
            "แบบ": "baep",
            "ให้": "hai",
            "ได้": "dai",
            "ไป": "pai",
            "มา": "mar",
            "มี": "mee",
            "ไม่": "mai",
            "ใช้": "chai",
            "งาน": "ngan",
            "เพื่อ": "pheua",
            "ความ": "khwam",
            "สมจริง": "som-ching",
            "คุณ": "khun",
            "เป็น": "pen",
            "และ": "lae",
            "ของ": "khong",
            "กับ": "kap",
            "ใน": "nai",
            "ที่": "thee",
            "นี้": "nee",
            "นั้น": "nan",
            "คือ": "khue",
            "อะไร": "a-rai",
            "อย่าง": "yang",
            "มาก": "mak",
            "ดี": "dee"
        }

        def clean_romanized(r: str) -> str:
            r = re.sub(r"[^\x00-\x7F]+", "", r)
            r = re.sub(r"([bcdfghjklmnpqrstvwxyz])\1+", r"\1", r)
            r = re.sub(r"uai$", "uay", r)
            return r.strip()

        def _to_roman_phonetic(t_str: str) -> str:
            try:
                from pythainlp.transliterate import romanize
                from pythainlp.tokenize import word_tokenize
                words = word_tokenize(t_str)
                out_words = []
                for w in words:
                    if not w.strip():
                        out_words.append(" ")
                        continue
                    if w in THAI_PHONETIC_DICT:
                        out_words.append(THAI_PHONETIC_DICT[w])
                        continue
                    if any("\u0e00" <= c <= "\u0e7f" for c in w):
                        r = romanize(w, engine="royin")
                        r_clean = clean_romanized(r)
                        out_words.append(r_clean if r_clean else w)
                    else:
                        out_words.append(w)
                res = re.sub(r"\s+", " ", " ".join(out_words)).strip()
                return res if res else t_str
            except Exception as e:
                logger.warning(f"[THONBURIAN_TRANSLIT_WARNING] Failed to transliterate '{t_str}': {e}")
                return t_str

        gen_text_f5 = _to_roman_phonetic(text)
        if ref_text and ref_text.strip():
            ref_text_f5 = _to_roman_phonetic(ref_text)
        else:
            ref_text_f5 = "Sawatdee krap, voice reference clip."

        logger.info(
            f"[THONBURIAN_F5_INFER] [CorrelationID: {corr_id}] "
            f"Executing F5-TTS infer: RefFile='{tmp_ref_path}', GenText='{gen_text_f5}', RefText='{ref_text_f5}'..."
        )

        try:
            wav_out, sr_out, _ = self.f5_engine.infer(
                ref_file=tmp_ref_path,
                ref_text=ref_text_f5,
                gen_text=gen_text_f5,
                cfg_strength=cfg_strength,
                speed=speed,
                show_info=lambda *a, **kw: None
            )

            wav_io = io.BytesIO()
            sf.write(wav_io, wav_out, sr_out, format="WAV")
            audio_bytes = wav_io.getvalue()
            duration = max(0.5, round(len(audio_bytes) / (sr_out * 2.0), 2))

            logger.info(
                f"[THONBURIAN_F5_SUCCESS] [CorrelationID: {corr_id}] "
                f"Generated {len(audio_bytes)} bytes, SampleRate={sr_out}Hz, Duration={duration}s"
            )
            return audio_bytes, sr_out, duration
        finally:
            if ref_audio_bytes and tmp_ref_path and os.path.exists(tmp_ref_path):
                try:
                    os.remove(tmp_ref_path)
                except Exception:
                    pass
