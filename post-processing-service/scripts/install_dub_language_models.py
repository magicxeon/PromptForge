"""Prepare pinned offline models without replacing any existing installation."""
import concurrent.futures
import shutil
import sys
import tempfile
import urllib.request
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from config.dub_model_manifest import components, sha256, verified_component
from config.service_config import load_post_processing_config


def download(component, target):
    with urllib.request.urlopen(component["url"],timeout=60) as response, target.open("xb") as dest:
        total = 0
        while chunk := response.read(1024*1024):
            total += len(chunk)
            if total>512*1024**2:
                raise ValueError("Model exceeds download size limit")
            dest.write(chunk)
    if sha256(target)!=component["sha256"]:
        raise ValueError("Downloaded model does not match its pinned checksum")


def install(root,name,component):
    files = component["files"]
    packaged = component["url"].endswith(".argosmodel")
    destination = root/name if packaged else root/next(iter(files))
    if destination.exists():
        verified_component(root,name)
        print("Verified",name,flush=True)
        return
    with tempfile.TemporaryDirectory(dir=root) as tmp:
        stage=Path(tmp)
        archive=stage/"download"
        download(component,archive)
        if packaged:
            with zipfile.ZipFile(archive) as bundle:
                if sum(i.file_size for i in bundle.infolist())>1024**3:
                    raise ValueError("Model exceeds unpacking limit")
                for item in bundle.infolist():
                    relative=name+"/"+"/".join(item.filename.split("/")[1:])
                    if relative not in files:
                        continue
                    dest=stage/relative
                    dest.parent.mkdir(parents=True,exist_ok=True)
                    with bundle.open(item) as source, dest.open("xb") as out:
                        shutil.copyfileobj(source,out)
            installed=stage/name
        else:
            installed=stage/next(iter(files))
            installed.parent.mkdir(parents=True,exist_ok=True)
            archive.rename(installed)
        verified_component(stage,name)
        destination.parent.mkdir(parents=True,exist_ok=True)
        installed.rename(destination)
        print("Installed",name,flush=True)


if __name__=="__main__":
    root=load_post_processing_config().dubLanguage.modelRoot
    root.mkdir(parents=True,exist_ok=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        jobs=[executor.submit(install,root,name,entry) for name,entry in components().items()]
        for job in jobs:
            job.result()
