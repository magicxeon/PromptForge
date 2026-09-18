import torch
from transformers import pipeline

device = 0 if torch.cuda.is_available() else "cpu"
pipe = pipeline(
    task="automatic-speech-recognition",
    model="biodatlab/whisper-th-medium-combined",
    chunk_length_s=30,
    device=device,
)
text = pipe("D:/applications/momelo-post-processing/models/thonburian-tts/ref_sample.wav", generate_kwargs={"language":"<|th|>", "task":"transcribe"})["text"]
print(f"TRANSCRIPT: {text}")
