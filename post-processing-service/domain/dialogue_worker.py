import contextlib
import io
import json
import sys
import tempfile
from pathlib import Path

from adapters.dialogue_audio_adapter import DialogueAudioAdapter
from adapters.openvoice_conversion_adapter import OpenVoiceConversionAdapter
from config.service_config import load_post_processing_config
from domain.dialogue_poc_manager import DialoguePocManager
from domain.faceless_previs import HTTPException_Like


def execute(command, manager=None, synthesizer=None, converter=None):
    config = load_post_processing_config()
    policy = config.dialoguePoc
    if not policy.enabled:
        raise HTTPException_Like("dialogue_poc_disabled", "Dialogue POC is disabled.", 503)
    manager = manager or DialoguePocManager(policy)
    adapter = DialogueAudioAdapter(policy)
    options = command["options"]
    source, source_path = manager.read_media(options["sourceMediaId"])
    profile = manager.read_profile(options["voiceProfileId"])
    if profile["consentRecordId"] != options["consentRecordId"]:
        raise HTTPException_Like("voice_consent_required", "Voice consent is unavailable.", 422)
    reference, reference_path = manager.read_media(profile["referenceMediaId"])
    if profile["endMs"] > reference["durationMs"]:
        raise HTTPException_Like("voice_reference_invalid", "Voice reference is no longer valid.", 422)
    reference_wav = adapter.extract_wav(reference_path, profile["startMs"], profile["endMs"])
    source_wav = adapter.extract_wav(source_path, mono=False)
    evidence = []
    with tempfile.TemporaryDirectory(dir=manager.root) as temp_name:
        temp = Path(temp_name)
        reference_file = temp / "reference.wav"
        reference_file.write_bytes(reference_wav)
        for index, segment in enumerate(options["segments"]):
            if command["operation"] == "audio.dialogue_repair":
                if synthesizer is None:
                    with contextlib.redirect_stdout(io.StringIO()):
                        from adapters.thonburian_tts_adapter import ThonburianTtsAdapter
                        synthesizer = ThonburianTtsAdapter(config.expressiveTts)
                with contextlib.redirect_stdout(io.StringIO()):
                    candidate, _, _, _, ai_used, fallback_used, _ = synthesizer.synthesize(
                        text=options["replacementText"], ref_audio_bytes=reference_wav,
                        ref_text=profile["referenceTranscript"], output_format="WAV")
                if not ai_used or fallback_used:
                    raise HTTPException_Like("voice_model_unavailable", "Thai synthesis was not executed.", 503)
            else:
                converter = converter or OpenVoiceConversionAdapter(policy)
                source_segment = temp / f"source_{index}.wav"
                source_segment.write_bytes(adapter.extract_wav(source_path, segment["startMs"], segment["endMs"]))
                candidate_path = temp / f"converted_{index}.wav"
                with contextlib.redirect_stdout(io.StringIO()):
                    converter.convert(source_segment, reference_file, candidate_path)
                candidate = candidate_path.read_bytes()
            source_wav, timing = adapter.splice(source_wav, candidate, segment["startMs"], segment["endMs"])
            evidence.append({**segment, **timing})
        audio_result = manager.store_media(source_wav, "audio/wav", source["mediaId"])
        result = {"operation": command["operation"], "sourceMediaId": source["mediaId"],
                  "audioMediaId": audio_result["mediaId"], "audioHash": audio_result["sha256"],
                  "intervals": evidence, "requiresReview": True}
        if source["hasVideo"]:
            audio_path = temp / "edited.wav"
            audio_path.write_bytes(source_wav)
            video_path = temp / "preview.mp4"
            adapter.remux(source_path, audio_path, video_path, source["durationMs"])
            video_result = manager.store_media(video_path.read_bytes(), "video/mp4", source["mediaId"])
            if abs(video_result["durationMs"] - source["durationMs"]) > 50:
                manager.delete("media", video_result["mediaId"])
                raise HTTPException_Like("video_duration_changed", "Export duration differs from source.", 422)
            result["previewMediaId"] = video_result["mediaId"]
            result["previewHash"] = video_result["sha256"]
        return result


def main():
    try:
        command = json.loads(sys.stdin.read())
        result = execute(command)
        sys.stdout.write(json.dumps({"result": result}, ensure_ascii=False))
    except HTTPException_Like as error:
        sys.stdout.write(json.dumps({"error": {"code": error.code, "message": error.message}}, ensure_ascii=False))
    except Exception:
        sys.stdout.write(json.dumps({"error": {"code": "audio_processing_failed", "message": "Audio processing failed."}}))


if __name__ == "__main__":
    main()
