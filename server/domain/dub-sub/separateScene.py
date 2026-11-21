"""Render the music and effects bed for a dubbed export at 48 kHz."""
import sys
from pathlib import Path

import numpy as np
import soundfile as sf


def separate(runtime, input_file, output_file):
    sys.path.insert(0, str(runtime))
    from bandit_infer import BanditSession

    with BanditSession(
        "v2-multi",
        device="cuda",
        checkpoint_path=runtime / "checkpoint-multi.ckpt",
        checkpoint_sha256="abcfccf65446752a057f4a302c941479a54b7560ebf8d7bca039d2ea98e64cfc",
    ) as model, sf.SoundFile(input_file) as source, sf.SoundFile(
        output_file, "w", samplerate=48000, channels=2, subtype="FLOAT"
    ) as dest:
        # Retain context on either side of chunk boundaries for long films.
        block = 48000 * 48
        context = 48000 * 8
        for start in range(0, len(source), block):
            end = min(start + block, len(source))
            left = max(start - context, 0)
            source.seek(left)
            samples = source.read(min(end + context, len(source)) - left, dtype="float32")
            stems = model.infer(samples.T, sample_rate=source.samplerate)
            scene = (stems["music"] + stems["effects"]).T[start-left:end-left]
            if len(scene) != end - start or not np.isfinite(scene).all():
                raise ValueError("invalid scene audio")
            dest.write(scene)


if __name__ == "__main__":
    separate(Path(sys.argv[1]), sys.argv[2], sys.argv[3])
