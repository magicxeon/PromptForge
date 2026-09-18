# PP001-f5-tts-chunking-and-ui
## ThonburianTTS (F5-TTS) Long-Form Audio Chunking & Playground UI

### 1. Goal
Overcome the F5-TTS generation limitation where long sentences (e.g. > 15-20 words) degrade in quality or fail. Introduce a chunking mechanism to segment long text, run the generation concurrently (multithreaded), and stitch the audio segments back together. Additionally, improve the TTS Playground UI by separating the workflow into distinct tabs for "Default Voice" and "Voice Cloning (Zero-Shot)" with mandatory reference text inputs.

### 2. Proposed Changes

#### 2.1 Backend Chunking and Threading (`adapters/thonburian_tts_adapter.py`)
- Introduce a smart text splitter in `ThonburianTtsAdapter` to divide long inputs using standard Thai spacing and punctuation.
- Implement `concurrent.futures.ThreadPoolExecutor` to process multiple text chunks in parallel.
- Maintain sequential ordering when concatenating the resulting audio bytes.
- Set a sensible `max_workers` limit (e.g., 2 or 3) to prevent GPU/CPU Out-Of-Memory errors during simultaneous inference.
- Update the default `ref_text` and `tmp_ref_path` to match the exact wording of the default reference audio.

#### 2.2 API Schema Updates (`api/schemas.py` or inline)
- Enforce the extraction of `refText` alongside `refAudioBase64` when submitting a Voice Cloning generation request.

#### 2.3 TTS Playground UI (`api/routes.py`)
- Split the interface into two distinct tabs:
  1. **Tab 1: Default Voice** - Hides file upload and reference text fields. Uses the pre-configured default voice.
  2. **Tab 2: Voice Cloning** - Displays file upload for the reference voice clip, and a mandatory text area for the **Reference Text** (the exact wording spoken in the clip).
- Update the JavaScript payload to pass `refText` explicitly to the `/v1/thonburian-tts` endpoint.

### 3. Verification Plan
- Send a very long Thai text exceeding the previous character limit.
- Verify that the logger shows chunking and concurrent execution.
- Validate that the concatenated `.wav` file is seamless and plays correctly.
- Test the HTML Playground UI tabs to ensure variables are passed correctly to the API.
