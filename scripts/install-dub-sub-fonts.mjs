// Installs the OFL-licensed subtitle fonts used by the browser and FFmpeg.
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
const directory = fileURLToPath(
  new URL("../client/assets/dub-sub/fonts/", import.meta.url),
);
const families = [
  "NotoSansThai",
  "NotoSerifThai",
  "NotoSansSC",
  "NotoSerifSC",
  "NotoSansTC",
  "NotoSerifTC",
];
await mkdir(directory, { recursive: true });
const read = async (url) => {
  const response = await fetch(url, {
    headers: { "User-Agent": "ModelPromptForge-font-installer" },
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) throw new Error(response.status + " " + url);
  return response;
};
const revision = "cc5661d43cd4f9aad5567033a8e15ca28dc35c86";
if (!/^[a-f0-9]{40}$/.test(revision))
  throw new Error("Invalid font source revision");
for (const family of families) {
  const dst = path.join(directory, family + ".ttf");
  const base =
    "https://raw.githubusercontent.com/google/fonts/" +
    revision +
    "/ofl/" +
    family.toLowerCase() +
    "/";
  const filename =
    family + (family.endsWith("Thai") ? "[wdth,wght].ttf" : "[wght].ttf");
  const license = await (await read(base + "OFL.txt")).text();
  if (!license.includes("SIL OPEN FONT LICENSE"))
    throw new Error("Missing license for " + family);
  const font = Buffer.from(
    await (await read(base + encodeURIComponent(filename))).arrayBuffer(),
  );
  if (font.readUInt32BE() !== 0x00010000)
    throw new Error("Invalid TrueType font for " + family);
  await writeFile(path.join(directory, family + "-OFL.txt"), license);
  const temp = dst + "." + randomUUID() + ".tmp";
  try {
    await writeFile(temp, font, { flag: "wx" });
    await rename(temp, dst);
  } finally {
    await rm(temp, { force: true });
  }
  console.log(family, font.length);
}
await writeFile(
  path.join(directory, "source.json"),
  JSON.stringify({ repository: "google/fonts", revision, families }, null, 2) +
    "\n",
);
