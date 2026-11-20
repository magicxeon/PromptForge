"""Apply the Dub Studio input policy before calling a local inference adapter."""
import re
from adapters.dub_language_adapter import DubLanguageAdapter, LanguageUnavailable


class DubLanguageManager:
    def __init__(self, adapter=None):
        self.adapter = adapter or DubLanguageAdapter()

    def translate(self, body, policy):
        if not policy.enabled:
            raise LanguageUnavailable("dub_translation_unavailable")
        rows, source, target = body.get("q"), body.get("source"), body.get("target")
        if not isinstance(rows,list) or not 1 <= len(rows) <= policy.maxRows or any(
                not isinstance(x,str) or not x.strip() or len(x)>policy.maxTextLength for x in rows):
            raise ValueError("dub_invalid_input")
        if source == "auto":
            combined = "".join(rows)
            source = "th" if re.search(r"[\u0e00-\u0e7f]", combined) else "zh" if re.search(r"[\u3400-\u9fff]",combined) else "en"
        if source not in ("th","zh","en") or target not in ("th","zh","en"):
            raise ValueError("dub_invalid_language")
        if source != target:
            steps = [(source,target)] if "en" in (source,target) else [(source,"en"),("en",target)]
            for origin,destination in steps:
                rows = self.adapter.translate(rows,origin+"-"+destination,policy)
        return {"translatedText":rows}

    def recognize(self, body, policy):
        if not policy.enabled:
            raise LanguageUnavailable("dub_ocr_unavailable")
        frames = body.get("frames")
        lang = {"zh":"chi_sim","zh-CN":"chi_sim","zh-TW":"chi_tra","th":"tha","en":"eng"}.get(body.get("language"))
        if not lang or not isinstance(frames,list) or not 1 <= len(frames) <= policy.maxFrames or any(
                not isinstance(frame,str) or len(frame)>policy.maxFrameChars for frame in frames):
            raise ValueError("dub_invalid_input")
        return {"texts":self.adapter.recognize(frames,lang,policy)}

    def capabilities(self, policy):
        return self.adapter.capabilities(policy)


dub_language_manager = DubLanguageManager()
