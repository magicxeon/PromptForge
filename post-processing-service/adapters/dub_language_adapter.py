"""Load verified model artifacts only from the configured local installation."""
import base64
import io
from functools import lru_cache
from importlib.util import find_spec
from config.dub_model_manifest import verified_component

class LanguageUnavailable(RuntimeError):
    pass


class DubLanguageAdapter:
    @staticmethod
    @lru_cache(maxsize=2)
    def translator(directory,device,fingerprint):
        import ctranslate2
        import sentencepiece
        return (ctranslate2.Translator(str(directory/"model"),device=device,
            compute_type="int8" if device=="cpu" else "default",intra_threads=4),
            sentencepiece.SentencePieceProcessor(model_file=str(directory/"sentencepiece.model")))

    def translate(self,rows,pair,policy):
        try:
            fingerprint = verified_component(policy.modelRoot,pair)
            model, codec = self.translator(policy.modelRoot/pair,policy.device,fingerprint)
        except (ImportError, OSError, RuntimeError, ValueError) as error:
            raise LanguageUnavailable("dub_translation_unavailable") from error
        tokens=codec.encode(rows,out_type=str)
        if any(len(line)>950 for line in tokens):
            raise ValueError("dub_translation_row_too_long")
        results=model.translate_batch(tokens,beam_size=4,max_input_length=1024,max_decoding_length=1024)
        return [codec.decode(result.hypotheses[0]).replace("▁"," ").strip() for result in results]

    def recognize(self,frames,lang,policy):
        from PIL import Image
        try:
            import tesserocr
            verified_component(policy.modelRoot,lang)
            engine=tesserocr.PyTessBaseAPI(path=str(policy.modelRoot/"tessdata"),lang=lang,psm=tesserocr.PSM.SINGLE_BLOCK)
        except (ImportError,OSError,RuntimeError,ValueError) as error:
            raise LanguageUnavailable("dub_ocr_unavailable") from error
        texts=[]
        with engine:
            for frame in frames:
                with Image.open(io.BytesIO(base64.b64decode(frame,validate=True))) as image:
                    if image.format!="PNG" or image.width*image.height>policy.maxPixels:
                        raise ValueError("dub_invalid_frame")
                    engine.SetImage(image)
                    texts.append(engine.GetUTF8Text().strip()[:policy.maxTextLength])
        return texts

    def capabilities(self,policy):
        def available(dependencies,models):
            if not policy.enabled or not all(find_spec(name) for name in dependencies):
                return False
            try: return all(verified_component(policy.modelRoot,name) for name in models)
            except (OSError,ValueError): return False
        return {
            "dub_translation":{"available":available(["ctranslate2","sentencepiece"],["zh-en","en-th","th-en","en-zh"]),
                "policyVersion":policy.policyVersion,"maxBytes":policy.maxTranslationBytes,"languages":["th","zh","en"]},
            "dub_subtitle_ocr":{"available":available(["tesserocr"],["chi_sim","chi_tra","eng","tha"]),
                "policyVersion":policy.policyVersion,"maxBytes":policy.maxOcrBytes,"languages":["th","zh-CN","zh-TW","en"]}
        }
