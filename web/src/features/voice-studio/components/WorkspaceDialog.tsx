import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/Button";

/** Feature-owned sheet/dialog. App navigation and shared dialog styles stay with their owners. */
export function WorkspaceDialog({
  open,
  onOpenChange,
  title,
  children,
  className = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useTranslation("voice-studio");
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="voice-dialog-overlay" />
        <Dialog.Content
          className={`voice-dialog ${className}`}
          aria-describedby={undefined}
        >
          <header className="voice-line">
            <Dialog.Title>{title}</Dialog.Title>
            <Dialog.Close asChild>
              <Button size="sm">{t("close")}</Button>
            </Dialog.Close>
          </header>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
