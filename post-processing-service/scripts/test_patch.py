import sys
import io
import tempfile
import numpy as np
import soundfile as sf
import torch
import torchaudio

# Enforce UTF-8 encoding for standard output and error to support Thai Unicode characters on Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

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

synth = np.sin(2 * np.pi * 440 * np.linspace(0, 3, 3 * 24000)).astype(np.float32)
with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
    sf.write(tmp.name, synth, 24000, format="WAV")
    tmp_path = tmp.name

from f5_tts.api import F5TTS
engine = F5TTS(device="cuda")
wav, sr_out, _ = engine.infer(
    ref_file=tmp_path,
    ref_text="Thai voice reference",
    gen_text="สวัสดีครับนี่คือการทดสอบ F5-TTS เสียงโคลนนิ่งสำเร็จแล้ว",
    show_info=lambda *a, **kw: None
)
print(f"CLONING SUCCESS WITH TORCHAUDIO LOAD PATCH! Generated audio bytes: {len(wav)}, sr: {sr_out}")
