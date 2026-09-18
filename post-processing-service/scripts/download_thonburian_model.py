"""
download_thonburian_model.py
-----------------------------
One-time developer script to download the ThonburianTTS Thai fine-tuned model
from biodatlab/ThonburianTTS (megaF5 folder) on HuggingFace.

Downloads:
  - megaF5/model_1250000.safetensors  (~1.2 GB)  Thai fine-tuned F5-TTS weights
  - megaF5/vocab.txt                  (~20 KB)   Thai-complete vocabulary

Saves to: D:/applications/momelo-post-processing/models/thonburian-tts/

Usage:
    python scripts/download_thonburian_model.py
"""

import os
import sys
import hashlib
import urllib.request
from pathlib import Path

# ── Destination ────────────────────────────────────────────────────────────────
MODEL_DIR = Path("D:/applications/momelo-post-processing/models/thonburian-tts")

# ── Files to download from HuggingFace ─────────────────────────────────────────
HF_BASE_URL = "https://huggingface.co/biodatlab/ThonburianTTS/resolve/main"
FILES = [
    {
        "name": "mega_vocab.txt",
        "url": f"{HF_BASE_URL}/megaF5/mega_vocab.txt",
        "min_bytes": 10_000,        # sanity check: at least 10 KB
        "required": True,
    },
    {
        "name": "mega_f5_last.safetensors",
        "url": f"{HF_BASE_URL}/megaF5/mega_f5_last.safetensors",
        "min_bytes": 500_000_000,   # sanity check: at least 500 MB
        "required": True,
    },
]


def _human_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} TB"


def _get_remote_size(url: str) -> int:
    """Returns the Content-Length from a HEAD request, or 0 on failure."""
    try:
        req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req) as resp:
            cl = resp.headers.get("Content-Length")
            return int(cl) if cl else 0
    except Exception:
        return 0


def _download_file(url: str, dest: Path, min_bytes: int) -> bool:
    """Download a single file with progress reporting. Returns True on success."""
    if dest.exists():
        local_size = dest.stat().st_size
        remote_size = _get_remote_size(url)
        if remote_size > 0 and local_size >= remote_size:
            print(f"  [SKIP] {dest.name} already complete ({_human_size(local_size)}). Skipping.")
            return True
        elif remote_size > 0 and local_size < remote_size:
            print(
                f"  [WARN] {dest.name} is incomplete: "
                f"{_human_size(local_size)} local vs {_human_size(remote_size)} remote. Re-downloading..."
            )
            dest.unlink()  # delete incomplete file before re-downloading
        elif local_size >= min_bytes:
            print(f"  [SKIP] {dest.name} exists ({_human_size(local_size)}) — could not verify remote size, skipping.")
            return True
        else:
            print(f"  [WARN] {dest.name} looks incomplete ({_human_size(local_size)}). Re-downloading...")

    print(f"  [DOWN] {dest.name}")
    print(f"         URL: {url}")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        downloaded = 0
        chunk_size = 1024 * 1024  # 1 MB chunks

        with urllib.request.urlopen(req) as resp, open(dest, "wb") as out:
            total = int(resp.headers.get("Content-Length", 0))
            while True:
                chunk = resp.read(chunk_size)
                if not chunk:
                    break
                out.write(chunk)
                downloaded += len(chunk)
                pct = (downloaded / total * 100) if total else 0
                bar = int(pct / 5)
                print(
                    f"\r         [{'█' * bar}{'░' * (20 - bar)}] {pct:5.1f}%  "
                    f"{_human_size(downloaded)} / {_human_size(total)}   ",
                    end="",
                    flush=True,
                )

        print()  # newline after progress bar
        final_size = dest.stat().st_size
        if final_size < min_bytes:
            print(f"  [FAIL] File too small after download: {_human_size(final_size)}")
            return False

        print(f"  [OK]   {dest.name} — {_human_size(final_size)}")
        return True

    except Exception as exc:
        print(f"\n  [ERROR] Failed to download {dest.name}: {exc}")
        return False


def main():
    print("=" * 60)
    print("  ThonburianTTS Thai Fine-Tuned Model Downloader")
    print("  Source: biodatlab/ThonburianTTS (megaF5 & megaIPA)")
    print("=" * 60)
    print()

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Destination: {MODEL_DIR}\n")

    success_all = True
    for file_info in FILES:
        dest = MODEL_DIR / file_info["name"]
        ok = _download_file(file_info["url"], dest, file_info["min_bytes"])
        if not ok and file_info["required"]:
            success_all = False
        print()

    print("=" * 60)
    if success_all:
        print("  All files downloaded successfully!")
        print()
        print("  Next step: restart post-processing-service and test TTS.")
        print(f"  Vocab : {MODEL_DIR / 'vocab.txt'}")
        print(f"  Model : {MODEL_DIR / 'model_1250000.safetensors'}")
    else:
        print("  One or more files failed to download.")
        print("  Check your internet connection and retry.")
        sys.exit(1)
    print("=" * 60)


if __name__ == "__main__":
    main()
