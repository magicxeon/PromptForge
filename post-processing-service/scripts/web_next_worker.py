"""Private worker for a locally launched FE24 API. Stdin follows its parent's lifetime."""
import os
import socket
import sys
import threading
import time
from pathlib import Path

def stop_on_parent_exit():
    # Poll the parent-owned pipe on Windows. A forever-blocked ReadFile on
    # this handle can prevent C runtime/ML initialization in another thread.
    if os.name == "nt":
        import ctypes
        import msvcrt
        from ctypes import wintypes
        peek = ctypes.WinDLL("kernel32", use_last_error=True).PeekNamedPipe
        peek.argtypes = (wintypes.HANDLE, wintypes.LPVOID, wintypes.DWORD,
                         wintypes.LPVOID, wintypes.LPVOID, wintypes.LPVOID)
        peek.restype = wintypes.BOOL
        handle = msvcrt.get_osfhandle(sys.stdin.fileno())
        while peek(handle, None, 0, None, None, None):
            time.sleep(0.5)
    else:
        descriptor = os.dup(sys.stdin.fileno())
        try:
            while os.read(descriptor, 64):
                pass
        finally:
            os.close(descriptor)
    os._exit(0)

if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    import uvicorn

    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen()
        port = listener.getsockname()[1]
        os.environ["POST_PROCESSING_PORT"] = str(port)
        from main import app

        class ReadyServer(uvicorn.Server):
            async def startup(self, sockets=None):
                await super().startup(sockets=sockets)
                if self.started:
                    threading.Thread(target=stop_on_parent_exit,daemon=True).start()
                    print(f"DUB_WORKER_PORT={port}", flush=True)

        ReadyServer(uvicorn.Config(app, host="127.0.0.1", port=port,
                                   log_level="warning", access_log=False)).run(sockets=[listener])
