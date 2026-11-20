// Own a local language worker only when the operator has not configured one.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import path from "node:path";
import dotenv from "dotenv";
const root = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: path.join(root, ".env"), quiet: true });
const service = path.join(root, "post-processing-service");
const windows = process.platform === "win32";
const python =
  process.env.POST_PROCESSING_PYTHON ||
  (windows
    ? path.join(
        process.env.VENV_DIR ||
          "D:/applications/momelo-post-processing/venv-py313",
        "Scripts",
        "python.exe",
      )
    : "python3");
let worker;
async function localWorker() {
  const token = randomBytes(32).toString("hex");
  // Pass only process/accelerator settings needed by Python. Provider credentials stay with the API.
  const names = [
    "PATH",
    "Path",
    "SYSTEMROOT",
    "SystemRoot",
    "WINDIR",
    "COMSPEC",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "HOME",
    "LOCALAPPDATA",
    "APPDATA",
    "PROGRAMFILES",
    "PROGRAMFILES(X86)",
    "PROGRAMDATA",
    "LD_LIBRARY_PATH",
    "CUDA_PATH",
    "CUDA_VISIBLE_DEVICES",
    "DUB_LANGUAGE_MODELS",
    "XDG_CACHE_HOME",
    "HF_HOME",
    "HF_HUB_CACHE",
    "TORCH_HOME",
  ];
  const env = Object.fromEntries(
    names
      .filter((k) => process.env[k] !== undefined)
      .map((k) => [k, process.env[k]]),
  );
  if (windows)
    for (const [key, dir] of Object.entries({
      XDG_CACHE_HOME: "cache",
      HF_HOME: "huggingface",
      TORCH_HOME: "torch",
    }))
      env[key] ??= "D:/development/temp/momelo-models/" + dir;
  Object.assign(env, {
    POST_PROCESSING_INTERNAL_TOKEN: token,
    POST_PROCESSING_HOST: "127.0.0.1",
    PYTHONUNBUFFERED: "1",
  });
  worker = spawn(python, ["scripts/web_next_worker.py"], {
    cwd: service,
    env,
    windowsHide: true,
    stdio: ["pipe", "pipe", "inherit"],
  });
  const proc = worker;
  const port = await new Promise((resolve, reject) => {
    const lines = createInterface({ input: proc.stdout });
    const timer = setTimeout(
      () => reject(new Error("Language worker startup timed out")),
      16000,
    );
    lines.on("line", (line) => {
      const match = /^DUB_WORKER_PORT=(\d+)$/.exec(line);
      if (match) {
        clearTimeout(timer);
        resolve(Number(match[1]));
      }
    });
    proc.once("error", () => {
      clearTimeout(timer);
      reject(new Error("Language worker executable unavailable"));
    });
    proc.once("exit", () => {
      clearTimeout(timer);
      reject(new Error("Language worker exited"));
    });
  });
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("Invalid worker port");
  process.env.POST_PROCESSING_INTERNAL_TOKEN = token;
  process.env.POST_PROCESSING_URL = "http://127.0.0.1:" + port;
}
if (
  !process.env.POST_PROCESSING_URL &&
  !process.env.POST_PROCESSING_INTERNAL_TOKEN &&
  (!windows || existsSync(python))
) {
  try {
    await localWorker();
  } catch {
    worker?.kill();
    console.warn(
      "Local language worker unavailable. Check the Dub & Sub installation guide.",
    );
  }
}
const stopWorker = () => {
  worker?.stdin?.end();
  worker?.kill();
};
process.once("exit", stopWorker);
const { prepareServerComposition, listenServer } =
  await import("../server/server.js");
try {
  const composition = await prepareServerComposition({
    report: (event) => console.warn("[Identity]", event.code),
  });
  const { server } = await listenServer(composition, {
    report: (event) => console.warn("[Startup]", event.code),
  });
  server.once("close", stopWorker);
  console.log(
    "Server listening on " +
      composition.authRuntime.host +
      ":" +
      composition.authRuntime.port,
  );
} catch (error) {
  stopWorker();
  throw error;
}
