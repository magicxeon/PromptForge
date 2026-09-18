from gtts import gTTS
import subprocess

# Generate MP3
tts = gTTS('สวัสดีครับ นี่คือเสียงต้นแบบภาษาไทย', lang='th')
tts.save('ref_th.mp3')

# Convert to 24kHz WAV
subprocess.run(['ffmpeg', '-y', '-i', 'ref_th.mp3', '-ar', '24000', '-ac', '1', 'ref_th.wav'])
print("Created ref_th.wav")
