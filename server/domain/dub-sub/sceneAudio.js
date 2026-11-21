import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { BANDIT_RUNTIME_DIR } from "../../config/paths.js";
import { dubError } from "../../repositories/dub-sub/DubProjectRepository.js";
import { mediaCommand, videoInput } from "./DubMediaService.js";

const run = promisify(execFile);
const worker = fileURLToPath(new URL("./separateScene.py", import.meta.url));
let gpuReady = Promise.resolve();

export async function sceneAudioFile(source, dir) {
  const cached = path.join(path.dirname(source), "scene-bandit-v2.wav");
  const separate = async () => {
    try {
      await fs.access(cached);
      return cached;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const input = path.join(dir, "scene-input.wav");
    const output = path.join(dir, "scene.wav");
    await mediaCommand([...videoInput(source), "-map", "0:a:0", "-ac", "2", "-ar", "48000", "-c:a", "pcm_f32le", input]);
    const python = process.env.BANDIT_PYTHON || (process.platform === "win32"
      ? "D:/applications/momelo-post-processing/venv-py313/Scripts/python.exe" : "python3");
    try {
      await run(python, [worker, BANDIT_RUNTIME_DIR, input, output], { windowsHide: true, timeout: 3600000 });
    } catch {
      throw dubError("dub_scene_separation_failed", 503);
    }
    await fs.rename(output, cached);
    return cached;
  };
  const result = gpuReady.then(separate);
  gpuReady = result.catch(() => {});
  return result;
}
