import assert from "node:assert/strict";
import test from "node:test";
import { wrapSubtitle } from "../server/domain/dub-sub/subtitleLayout.js";
import { defaultSubtitleFont, subtitleFontFaces, subtitleLanguage } from "../server/domain/dub-sub/subtitleFonts.js";

const style = { font: "sans", x: 50, size: 48, maxChars: 14 };

test("subtitle font selection shares configured primary faces and fallbacks for each script", () => {
  const source = { sourceLanguage: "auto", cues: [{ text: "這是一段字幕" }] };
  assert.equal(subtitleLanguage(source, "source"), "zh");
  assert.equal(subtitleLanguage({ ...source, detectedLanguage: "zh-TW" }, "source"), "zh-TW");
  assert.equal(subtitleLanguage({ ...source, cues: [{ text: "คำบรรยาย" }] }, "source"), "th");
  assert.equal(subtitleLanguage(source, "th"), "th");
  assert.equal(defaultSubtitleFont, "sans");
  assert.deepEqual(subtitleFontFaces("sans", subtitleLanguage(source, "source")).map(face => face.file),
    ["NotoSansSC.ttf", "NotoSansThai.ttf"]);
  assert.deepEqual(subtitleFontFaces("serif", "zh-TW").map(face => face.file),
    ["NotoSerifTC.ttf", "NotoSerifThai.ttf", "NotoSerifSC.ttf"]);
  assert.equal(subtitleFontFaces("retired-font", "th")[0].family, "Noto Sans Thai");
});

test("Thai soft breaks use dictionary words and retain hard breaks", () => {
  const text = "คนในโรงเตี๊ยมนี้หายไปไหนกันหมด?\n\nท่านพี่";
  assert.equal(wrapSubtitle(text, "th", style, 9/16), "คนในโรงเตี๊ยมนี้\nหายไปไหนกันหมด?\n\nท่านพี่");
});

test("overlong words keep each written cluster intact and portrait width limits lines", () => {
  const text = "โรงเตี๊ยมอยู่ที่นี่ใช่ไหมครับ";
  const graphemes = new Intl.Segmenter("th", { granularity: "grapheme" });
  const positions = new Set(Array.from(graphemes.segment(text), part => part.index));
  const lines = wrapSubtitle(text, "th", { ...style, maxChars: 2 }, 9/16).split("\n");
  let offset = 0;
  for (const line of lines) {
    assert.ok(positions.has(offset) && !/^\p{Mark}/u.test(line));
    offset += line.length;
  }
  assert.equal(lines.join(""), text);
  for (const font of ["sans", "serif"]) {
    const paragraph = "ท่านพี่ วันนี้พักที่โรงเตี๊ยม River Inn ได้ไหมครับ";
    const format = { ...style, font, maxChars: 100 };
    const portrait = wrapSubtitle(paragraph, "th", format, 9/16);
    const landscape = wrapSubtitle(paragraph, "th", format, 16/9);
    assert.ok(portrait.split("\n").length > landscape.split("\n").length);
    assert.equal(portrait.replace(/\s/g, ""), paragraph.replace(/\s/g, ""));
  }
});
