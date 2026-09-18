import sys
import logging
from pathlib import Path

SERVICE_ROOT = Path("d:/development/ModelPromptForge/post-processing-service")
sys.path.insert(0, str(SERVICE_ROOT))

# Mock policy
class MockPolicy:
    modelPath = "D:/applications/momelo-post-processing/models/thonburian-tts"

import adapters.thonburian_tts_adapter as adapter
logging.basicConfig(level=logging.INFO)

tts = adapter.ThonburianTtsAdapter(policy=MockPolicy())

text_original = "นี่คือภาษาไทย"
text_punctuated = "นี่คือภาษาไทย ."
text_padded = "นี่คือภาษาไทย ครับผม ."

print("Testing Original...")
wav1, sr1, dur1, *_ = tts.synthesize(text=text_original, cfg_strength=2.0)
print(f"Original duration: {dur1}")
with open("test_out_orig.wav", "wb") as f: f.write(wav1)

print("Testing Punctuated...")
wav2, sr2, dur2, *_ = tts.synthesize(text=text_punctuated, cfg_strength=2.0)
print(f"Punctuated duration: {dur2}")
with open("test_out_punct.wav", "wb") as f: f.write(wav2)

print("Testing Padded...")
wav3, sr3, dur3, *_ = tts.synthesize(text=text_padded, cfg_strength=2.0)
print(f"Padded duration: {dur3}")
with open("test_out_padded.wav", "wb") as f: f.write(wav3)

print("Done.")
