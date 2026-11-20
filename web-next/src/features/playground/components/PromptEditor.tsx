import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Expand, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useActor } from "../../../lib/canonical";

export function PromptEditor({ value, onChange, hardLimit }: {
  value: string;
  onChange: (value: string) => void;
  hardLimit?: number | null;
}) {
  const { t } = useTranslation();
  const { isLoading } = useActor();
  const [expanded, setExpanded] = useState(false);
  const inline = useRef<HTMLTextAreaElement>(null);
  const modal = useRef<HTMLTextAreaElement>(null);
  const selection = useRef({ start: 0, end: 0 });
  useEffect(() => { if (isLoading) setExpanded(false); }, [isLoading]);
  const rememberSelection = (node: HTMLTextAreaElement | null) => {
    if (node) selection.current = { start: node.selectionStart, end: node.selectionEnd };
  };
  const footer = <div className="prompt-foot">
    <span>{t("savedDraft")}</span>
    <span>{Array.from(value).length.toLocaleString()}{hardLimit ? ` / ${hardLimit.toLocaleString()}` : ""}</span>
  </div>;
  return <Dialog.Root open={expanded && !isLoading} onOpenChange={open => {
    rememberSelection(open ? inline.current : modal.current);
    setExpanded(open);
  }}>
    <div className="prompt-control">
      <div className="prompt-heading">
        <label htmlFor="prompt">{t("prompt")}</label>
        <Dialog.Trigger asChild>
          <button type="button" aria-label={t("expandPrompt")} title={t("expandPrompt")}><Expand size={16} /></button>
        </Dialog.Trigger>
      </div>
      <textarea ref={inline} id="prompt" placeholder={t("promptPlaceholder")}
        value={value} onChange={event => onChange(event.target.value)} rows={7} />
      {footer}
    </div>
    {expanded && !isLoading && <Dialog.Portal>
      <Dialog.Overlay className="dialog-overlay" />
      <Dialog.Content className="expanded-prompt" onOpenAutoFocus={event => {
        event.preventDefault();
        modal.current?.focus({ preventScroll: true });
        modal.current?.setSelectionRange(selection.current.start, selection.current.end);
      }} onCloseAutoFocus={() => {
        inline.current?.setSelectionRange(selection.current.start, selection.current.end);
      }}>
        <div className="prompt-dialog-heading">
          <Dialog.Title>{t("prompt")}</Dialog.Title>
          <Dialog.Close asChild><button type="button"><X size={16} />{t("close")}</button></Dialog.Close>
        </div>
        <Dialog.Description>{t("expandedPromptHelp")}</Dialog.Description>
        <textarea ref={modal} id="expanded-prompt" aria-label={t("prompt")}
          placeholder={t("promptPlaceholder")} value={value} onChange={event => onChange(event.target.value)} />
        {footer}
      </Dialog.Content>
    </Dialog.Portal>}
  </Dialog.Root>;
}
