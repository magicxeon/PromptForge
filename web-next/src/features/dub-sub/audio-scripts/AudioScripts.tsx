import { useRef, useState } from "react";
import { useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRight, FileAudio2, Plus } from "lucide-react";
import { voiceApi } from "../../../../../web/src/features/voice-studio/api/voiceStudioApi";
import { assertIdentityEpoch } from "../../../../../web/src/lib/auth/actorStore";
import { getIdentitySnapshot, ProcessingSpinner, useActor } from "../../../lib/canonical";
import { Dialog } from "../Dialog";
import config from "../dubbing-voice-config.json";
import "./styles.css";

export const scriptsPath = "/dub-sub/audio-scripts";

export default function AudioScripts() {
  const { identityScope } = useActor();
  return <Library key={identityScope} scope={identityScope} />;
}

function Library({ scope }: { scope: string }) {
  const { t, i18n } = useTranslation("audioScripts");
  const client = useQueryClient();
  const navigate = useNavigate();
  const list = useInfiniteQuery({
    queryKey: ["audio-scripts", scope, "list"],
    initialPageParam: "",
    queryFn: ({ pageParam }) => voiceApi.documents(pageParam || undefined, "audio-script"),
    getNextPageParam: last => last.nextCursor || undefined,
  });
  const catalog = useQuery({ queryKey: ["dubVoice", scope, "catalog"], queryFn: voiceApi.catalog });
  const model = catalog.data?.models.find(m => m.id === config.modelId);
  const languages = model?.capabilities.languages ?? [];
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(false);
  const lock = useRef(false);
  const entries = list.data?.pages.flatMap(page => page.items.filter(d => !d.archivedAt)) || [];
  const languageNames = new Intl.DisplayNames([i18n.language], { type: "language" });

  async function create() {
    if (!name.trim() || !language || lock.current) return;
    const { epoch } = getIdentitySnapshot();
    lock.current = true;
    setCreating(true);
    setError(false);
    try {
      const doc = await voiceApi.createDocument({ kind: "audio-script", title: name.trim(), language, modelId: config.modelId });
      assertIdentityEpoch(epoch);
      client.setQueryData(["audio-scripts", scope, doc.id], doc);
      void client.invalidateQueries({ queryKey: ["audio-scripts", scope, "list"] });
      navigate(scriptsPath + "/" + doc.id);
    } catch {
      setError(true);
    } finally {
      lock.current = false;
      setCreating(false);
    }
  }
  return <section className="audio-scripts">
    <header className="as-page-head"><h1>{t("title")}</h1>
      <button type="button" className="primary" disabled={!languages.length}
        onClick={() => { setName(""); setError(false); setLanguage(languages.includes(i18n.language) ? i18n.language : languages[0]); setAdding(true); }}>
        <Plus size={17} aria-hidden />{t("newScript")}
      </button>
    </header>
    {(list.isPending || catalog.isPending) && <p role="status"><ProcessingSpinner /> {t("loading")}</p>}
    {(list.isError || catalog.isError) && <p role="alert">{t("loadError")} <button onClick={() => { void list.refetch(); void catalog.refetch(); }}>{t("retry")}</button></p>}
    {list.isSuccess && !entries.length && <p className="as-empty">{t("empty")}</p>}
    <ul className="as-library">{entries.map(doc => <li key={doc.id}>
      <Link to={scriptsPath + "/" + doc.id}><FileAudio2 aria-hidden size={20} />
        <span><strong>{doc.title}</strong><small>{languageNames.of(doc.language)} · {t("lineCount", { count: doc.rows.length })}</small></span>
        <ChevronRight size={18} aria-hidden />
      </Link>
    </li>)}</ul>
    {list.hasNextPage && <button disabled={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>{t("more")}</button>}
    {adding && <Dialog label={t("newScript")} onClose={() => { if (!creating) setAdding(false); }}>
      <form className="as-dialog" onSubmit={e => { e.preventDefault(); void create(); }}>
        <h2>{t("newScript")}</h2>
        <label>{t("name")}<input autoFocus required maxLength={Number(catalog.data?.policy.maxTitleLength) || undefined}
          value={name} onChange={e => setName(e.target.value)} /></label>
        <label>{t("language")}<select value={language} onChange={e => setLanguage(e.target.value)}>
          {languages.map(lang => <option key={lang} value={lang}>{languageNames.of(lang)}</option>)}
        </select></label>
        {error && <p role="alert">{t("createError")}</p>}
        <div className="as-actions"><button type="button" disabled={creating} onClick={() => setAdding(false)}>{t("cancel")}</button>
          <button className="primary" disabled={creating || !name.trim()}>{creating && <ProcessingSpinner />}{t("create")}</button></div>
      </form>
    </Dialog>}
  </section>;
}
