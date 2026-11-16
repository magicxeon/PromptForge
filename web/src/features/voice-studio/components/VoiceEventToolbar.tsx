import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";
import type { VoiceCatalog } from "../schemas/voiceStudioSchemas";

export function VoiceEventToolbar({
  policy,
  onInsert,
  disabled = false,
  onRestoreFocus,
}: {
  policy: VoiceCatalog["policy"];
  onInsert: (tag: string) => void;
  disabled?: boolean;
  onRestoreFocus?: () => void;
}) {
  const { t } = useTranslation("voice-studio");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const supported = policy.inlineTags;
  const frequent = (policy.eventToolbarTags || supported.slice(0, 4)).filter(
    (tag) => supported.includes(tag),
  );
  const groups = policy.eventGroups || [];
  const label = (tag: string) =>
    t(`events.${tag.replace(/[<> ]/g, "")}`, { defaultValue: tag });
  const filtered = supported.filter(
    (tag) =>
      (!category ||
        groups.find((group) => group.id === category)?.tags.includes(tag)) &&
      `${label(tag)} ${tag}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  return (
    <div
      className="voice-event-toolbar"
      role="toolbar"
      aria-label={t("insertEvent")}
    >
      {frequent.map((tag) => (
        <Button
          key={tag}
          size="sm"
          variant="ghost"
          disabled={disabled}
          title={t("insertEventHint", { event: label(tag), token: tag })}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => onInsert(tag)}
        >
          {label(tag)}
        </Button>
      ))}
      <Dialog.Root
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) {
            setSearch("");
            setCategory("");
          }
        }}
      >
        <Dialog.Trigger asChild>
          <Button size="sm" variant="ghost" disabled={disabled}>
            {t("moreEvents")}
          </Button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="voice-dialog-overlay" />
          <Dialog.Content
            className="voice-dialog voice-events-dialog"
            aria-describedby={undefined}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              onRestoreFocus?.();
            }}
          >
            <header className="voice-line">
              <Dialog.Title>{t("insertEvent")}</Dialog.Title>
              <Dialog.Close asChild>
                <Button size="sm">{t("close")}</Button>
              </Dialog.Close>
            </header>
            <label>
              {t("searchEvents")}
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            {groups.length ? (
              <label>
                {t("eventCategory")}
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  <option value="">{t("all")}</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {t(group.labelKey)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="voice-event-options">
              {filtered.map((tag) => (
                <Button
                  key={tag}
                  variant="ghost"
                  onClick={() => {
                    setOpen(false);
                    requestAnimationFrame(() => onInsert(tag));
                  }}
                >
                  <strong>{label(tag)}</strong>
                  <span>{tag}</span>
                  <small>{t("eventExample", { token: tag })}</small>
                </Button>
              ))}
            </div>
            {!filtered.length ? <p>{t("noEvents")}</p> : null}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
