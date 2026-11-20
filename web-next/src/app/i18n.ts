import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import th from "../locales/th/workspace.json";
import en from "../locales/en/workspace.json";
import comparisonTh from "../locales/th/comparison.json";
import comparisonEn from "../locales/en/comparison.json";
import videoTh from "../locales/th/video.json";
import videoEn from "../locales/en/video.json";
import uiTh from "../../../client/i18n/locales/th/react-ui.json";
import uiEn from "../../../client/i18n/locales/en/react-ui.json";
import legacyComparisonTh from "../../../client/i18n/locales/th/comparisons.json";
import legacyComparisonEn from "../../../client/i18n/locales/en/comparisons.json";
// The legacy catalog uses single braces; FE24 uses i18next's default double braces.
const legacyNamespace = (catalog: Record<string, string>) => Object.fromEntries(
  Object.entries(catalog).map(([key,value]) => [key,value.replace(/(?<!\{)\{(\w+)\}(?!\})/g,"{{$1}}")]),
);
const consentNamespace = (catalog: Record<string, string>) => Object.fromEntries(
  Object.entries(catalog).filter(([key]) => key.startsWith("ui.creditConsent.") || key.startsWith("ui.action.")),
);
// The shared picker keeps its existing namespace; labels are owned by this
// preview's two catalogs rather than importing the previous application's UI.
const pickerNamespace = (catalog: typeof en) => ({ playground: {
  engine: { model: catalog.model },
  options: {
    allProviders: catalog.allModels, providers: catalog.providers,
    chooseModel: catalog.chooseModel, searchModels: catalog.searchModels,
    noModels: catalog.noMatchingModels, modelUnavailable: catalog.modelUnavailable,
  },
} });
void i18n.use(initReactI18next).init({
  resources: {
    th: { workspace: th, comparison: comparisonTh, comparisons: legacyNamespace(legacyComparisonTh), video: videoTh, playground: pickerNamespace(th), "react-ui": consentNamespace(uiTh) },
    en: { workspace: en, comparison: comparisonEn, comparisons: legacyNamespace(legacyComparisonEn), video: videoEn, playground: pickerNamespace(en), "react-ui": consentNamespace(uiEn) },
  },
  lng: localStorage.getItem("mpf.next.language") === "en" ? "en" : "th",
  fallbackLng: "en",
  supportedLngs: ["th", "en"],
  defaultNS: "workspace",
  interpolation: { escapeValue: false },
});
i18n.on("languageChanged", (language) => {
  document.documentElement.lang = language;
  localStorage.setItem("mpf.next.language", language);
});
document.documentElement.lang = i18n.language;
export default i18n;
