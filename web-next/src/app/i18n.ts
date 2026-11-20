import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import th from "../locales/th/workspace.json";
import en from "../locales/en/workspace.json";
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
    th: { workspace: th, playground: pickerNamespace(th) },
    en: { workspace: en, playground: pickerNamespace(en) },
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
