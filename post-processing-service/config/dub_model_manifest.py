"""Pinned local model inventory shared by the installer and inference adapter."""
import hashlib
import json
from functools import lru_cache
from pathlib import Path


@lru_cache(maxsize=1)
def components():
    with Path(__file__).with_name("dub_language_models.json").open(encoding="utf-8") as src:
        return json.load(src)["components"]


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as src:
        while chunk := src.read(1024 * 1024):
            digest.update(chunk)
    return digest.hexdigest()


@lru_cache(maxsize=64)
def check_file(path, expected, identity):
    if sha256(path) != expected:
        raise ValueError("Dub model checksum mismatch for " + path.name)
    return identity


def verified_component(root, name):
    # Hash once per observed file identity. Replacing or changing a local file
    # invalidates the cached result before the adapter can reuse its model.
    fingerprint = []
    for relative, expected in components()[name]["files"].items():
        filename = root / relative
        stat = filename.stat()
        identity = (stat.st_dev, stat.st_ino, stat.st_size, stat.st_mtime_ns, stat.st_ctime_ns)
        fingerprint.append(check_file(filename, expected, identity))
    return tuple(fingerprint)
