export function validSpeechWindows(windows, durationMs) {
  if (windows === undefined) return true;
  return Number.isSafeInteger(durationMs) && durationMs > 0 &&
    Array.isArray(windows) && windows.length > 0 && windows.length <= 12 &&
    windows.every((w,i) => w && Object.keys(w).every(k=>k==='startMs' || k==='endMs') &&
      Number.isSafeInteger(w.startMs) && Number.isSafeInteger(w.endMs) &&
      w.startMs >= (i ? windows[i-1].endMs : 0) && w.endMs > w.startMs && w.endMs <= durationMs);
}

// Split only at word boundaries. Intervening punctuation and whitespace stay
// with their source words so concatenating the phrases restores the exact line.
function phrasesFor(text, language, windows) {
  const words = [...new Intl.Segmenter(language,{granularity:'word'}).segment(text)].filter(s=>s.isWordLike);
  if (words.length < windows.length || /<[^>]+>/.test(text)) return null;
  const total = windows.reduce((sum,w)=>sum+w.endMs-w.startMs,0);
  const phrases = [];
  let elapsed = 0, from = 0, firstWord = 0;
  for (let i=0; i<windows.length-1; i++) {
    elapsed += windows[i].endMs - windows[i].startMs;
    const limit = words.length - (windows.length-i-1);
    let cutWord = firstWord+1, best = Infinity;
    for (let n=firstWord+1;n<=limit;n++) {
      const at = words[n].index;
      const punctuation = /[.,!?;:…。！？、，]\s*$/u.test(text.slice(words[n-1].index,at));
      const score = Math.abs(at/text.length - elapsed/total) - (punctuation ? 0.08 : 0);
      if (score < best) { best=score; cutWord=n; }
    }
    phrases.push(text.slice(from,words[cutWord].index));
    from=words[cutWord].index; firstWord=cutWord;
  }
  phrases.push(text.slice(from));
  return phrases;
}

export function timedSpeechDirection(text, language, windows) {
  const ranges = windows.map(w=>`[${w.startMs/1000}s:${w.endMs/1000}s]`);
  const phrases = phrasesFor(text,language,windows);
  const rule = 'Times are relative to the start of this audio. Speak only inside the indicated speech windows. Keep silence before onset, during the intervening pauses, and after the last word. No added words or sounds.';
  if (!phrases) return `${rule}\nSpeech windows: ${ranges.join(', ')}\nSay exactly: ${JSON.stringify(text)}`;
  return [rule, ...phrases.map((phrase,i)=>`${ranges[i]} Say exactly: ${JSON.stringify(phrase)}`)].join('\n');
}
