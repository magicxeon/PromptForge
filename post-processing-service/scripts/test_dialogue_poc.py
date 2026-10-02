import io
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
import soundfile as sf

from adapters.dialogue_audio_adapter import DialogueAudioAdapter
from domain.dialogue_poc_manager import DialoguePocManager, validate_interval
from domain.faceless_previs import HTTPException_Like
from domain.job_queue import JobQueueManager


def policy(root):
    return SimpleNamespace(scratchRoot=str(root), maxInputBytes=67108864,
        maxSourceSeconds=60, maxEditSeconds=20, maxTextLength=1000,
        retentionSeconds=86400, fadeMs=20, maxStretchRatio=1.1,
        ffmpegPath="ffmpeg", ffprobePath="ffprobe", jobTimeoutSeconds=300)


class DialoguePocTests(unittest.TestCase):
    def test_intervals_reject_bool_reversal_and_out_of_bounds(self):
        for start, end in ((True, 500), (700, 600), (0, 1001), (0, 0)):
            with self.assertRaises(HTTPException_Like):
                validate_interval(start, end, 1000, 20)
        validate_interval(100, 900, 1000, 20)

    def test_splice_preserves_all_samples_outside_selected_stereo_interval(self):
        settings = policy(Path(tempfile.gettempdir()))
        adapter = DialogueAudioAdapter(settings)
        rate = 16000
        original = np.repeat(np.arange(rate * 2, dtype=np.int16)[:, None], 2, axis=1)
        original[:, 1] *= -1
        source = io.BytesIO()
        sf.write(source, original, rate, format="WAV", subtype="PCM_16")
        with patch.object(adapter, "fit_candidate", return_value=(np.full(8000, 1000, dtype=np.int16), 1.0)):
            changed, evidence = adapter.splice(source.getvalue(), b"candidate", 500, 1000)
        output, _ = sf.read(io.BytesIO(changed), dtype="int16")
        np.testing.assert_array_equal(original[:8000], output[:8000])
        np.testing.assert_array_equal(original[16000:], output[16000:])
        self.assertEqual(evidence["startSample"], 8000)
        self.assertEqual(evidence["endSample"], 16000)

    def test_media_ids_and_hashes_are_private_and_checked(self):
        with tempfile.TemporaryDirectory() as root:
            manager = DialoguePocManager(policy(root))
            fake_probe = {"format": {"duration": "5.0"}, "streams": [
                {"codec_type": "audio", "channels": 1, "sample_rate": "16000"}]}
            completed = SimpleNamespace(stdout=json.dumps(fake_probe).encode())
            with patch("domain.dialogue_poc_manager.subprocess.run", return_value=completed):
                record = manager.store_media(b"fixture", "audio/wav")
            self.assertEqual(manager.media_result(record["mediaId"])["bytesBase64"], "Zml4dHVyZQ==")
            with self.assertRaises(HTTPException_Like):
                manager.read_media("../outside")
            (Path(root) / record["fileName"]).write_bytes(b"changed")
            with self.assertRaises(HTTPException_Like):
                manager.read_media(record["mediaId"])


class DialogueQueueTests(unittest.IsolatedAsyncioTestCase):
    async def test_audio_idempotency_and_conflict(self):
        with tempfile.TemporaryDirectory() as root:
            queue = JobQueueManager(data_dir=Path(root))
            config = SimpleNamespace(dialoguePoc=SimpleNamespace(retentionSeconds=86400, maxQueuedJobs=10))
            state = SimpleNamespace(config=config)

            async def no_worker(*_):
                return None

            queue._process_job_async = no_worker
            options = {"sourceMediaId": "media_a", "voiceProfileId": "voice_a"}
            first = await queue.create_job("audio.dialogue_repair", b"", options,
                                           idempotency_key="one", app_state=state)
            repeated = await queue.create_job("audio.dialogue_repair", b"", options,
                                              idempotency_key="one", app_state=state)
            self.assertEqual(first["jobId"], repeated["jobId"])
            self.assertTrue(repeated["isDuplicate"])
            with self.assertRaises(HTTPException_Like):
                await queue.create_job("audio.dialogue_repair", b"", {**options, "startMs": 1},
                                       idempotency_key="one", app_state=state)
            self.assertTrue((Path(root) / "jobs.json").is_file())

    async def test_restart_terminalizes_interrupted_audio_job(self):
        with tempfile.TemporaryDirectory() as root:
            queue = JobQueueManager(data_dir=Path(root))
            config = SimpleNamespace(dialoguePoc=SimpleNamespace(retentionSeconds=86400, maxQueuedJobs=10))
            state = SimpleNamespace(config=config)

            async def no_worker(*_):
                return None

            queue._process_job_async = no_worker
            created = await queue.create_job("audio.voice_conversion", b"", {},
                                             idempotency_key="restart", app_state=state)
            restored = JobQueueManager(data_dir=Path(root))
            status = await restored.get_job_status(created["jobId"])
            self.assertEqual(status["status"], "failed")
            self.assertEqual(status["error"]["code"], "job_interrupted")


if __name__ == "__main__":
    unittest.main()
