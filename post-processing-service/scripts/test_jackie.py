import sys
import os
import time

# Ensure imports work from the root of the project
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from adapters.thonburian_tts_adapter import ThonburianTtsAdapter

class MockPolicy:
    maxTextLength = 2000
    defaultSampleRate = 24000
    modelPath = "D:/applications/momelo-post-processing/models/thonburian-tts"

def main():
    print("Initializing ThonburianTTS (megaF5)...")
    adapter = ThonburianTtsAdapter(policy=MockPolicy())

    text = "ยินดีที่ได้รู้จักคุณ ผมชื่อแจ็กกี้ มาจากฮ่องกง แสดงหนังหลายเรื่อง"
    ref_voice_path = "ref_samples/sampling-test4.wav"
    ref_text = "ฉินหลงคุยกับโจวซิงฉือก็บอก 'พี่ ไปประเทศไหน พี่ก็สู้กันธรรมดา แต่มาเมืองไทยพี่ต้องฟัด ไปที่ไหน เอ็งก็เป็นคนธรรมดา แต่มาเมืองไทยเอ็งเป็นแค่คนเล็ก"

    print(f"\n--- Generating Speech ---")
    print(f"Ref Audio: {ref_voice_path}")
    print(f"Ref Text:  {ref_text}")
    print(f"Text to Gen: {text}")

    with open(ref_voice_path, "rb") as f:
        ref_audio_bytes = f.read()

    # Generate
    t0 = time.time()
    audio_bytes, sr, duration, mode, _, _, _ = adapter.synthesize(
        text=text,
        ref_audio_bytes=ref_audio_bytes,
        ref_text=ref_text,
        cfg_strength=2.5,
        speed=1.0,
        emotion="neutral"
    )
    
    out_file = "outputs_f5/jackie_chan_output.wav"
    os.makedirs("outputs_f5", exist_ok=True)
    with open(out_file, "wb") as f:
        f.write(audio_bytes)

    print(f"\nSUCCESS!")
    print(f"Generated {duration:.2f} seconds of audio in {time.time()-t0:.2f} seconds.")
    print(f"Saved to: {os.path.abspath(out_file)}")

if __name__ == '__main__':
    main()
