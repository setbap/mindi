import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/i18n-context";
import { registerPwa, type PwaRegistrationCallbacks } from "@/pwa/register";

export type { PwaRegistrationCallbacks };

export type PwaRegistration = (
  callbacks: PwaRegistrationCallbacks,
) => Promise<void>;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

interface PwaControlsProps {
  editing: boolean;
  onDiscardDraft: () => void;
  register?: PwaRegistration;
}

export function PwaControls({
  editing,
  onDiscardDraft,
  register = registerPwa,
}: PwaControlsProps) {
  const { t } = useI18n();
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [update, setUpdate] = useState<
    ((reloadPage?: boolean) => Promise<void>) | null
  >(null);
  const [draftGateOpen, setDraftGateOpen] = useState(false);
  const offlineReadyShown = useRef(false);
  const translateRef = useRef(t);
  translateRef.current = t;

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (!installDismissed && "prompt" in event) {
        setInstallPrompt(event as BeforeInstallPromptEvent);
      }
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, [installDismissed]);

  useEffect(() => {
    void register({
      onOfflineReady: () => {
        if (!offlineReadyShown.current) {
          offlineReadyShown.current = true;
          toast.success(translateRef.current("offlineReady"));
        }
      },
      onNeedRefresh: (nextUpdate) => setUpdate(() => nextUpdate),
    });
  }, [register]);

  async function install() {
    const prompt = installPrompt;
    setInstallPrompt(null);
    setInstallDismissed(true);
    await prompt?.prompt();
  }

  function dismissInstall() {
    setInstallPrompt(null);
    setInstallDismissed(true);
  }

  async function reloadUpdate() {
    if (!update) return;
    if (editing) {
      setDraftGateOpen(true);
      return;
    }
    await update(true);
  }

  function finishEditing() {
    setDraftGateOpen(false);
    queueMicrotask(() => {
      document.querySelector<HTMLTextAreaElement>("textarea")?.focus();
    });
  }

  async function discardAndReload() {
    if (!update) return;
    onDiscardDraft();
    setDraftGateOpen(false);
    await update(true);
  }

  return (
    <>
      {installPrompt ? (
        <aside
          className="bg-card flex max-w-sm flex-col gap-2 rounded-md border p-3 shadow-sm"
          aria-label={t("installMindi")}
        >
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{t("installMindi")}</p>
            <p className="text-muted-foreground text-xs leading-snug">
              {t("installMindiDescription")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" onClick={() => void install()}>
              {t("installMindi")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={dismissInstall}
            >
              {t("notNow")}
            </Button>
          </div>
        </aside>
      ) : null}

      {update ? (
        <aside
          className="bg-card flex flex-wrap items-center gap-2 rounded-md border p-2 shadow-sm"
          aria-label={t("updateReady")}
        >
          <span className="text-sm font-medium">{t("updateReady")}</span>
          <Button type="button" size="sm" onClick={() => void reloadUpdate()}>
            {t("reloadUpdate")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setUpdate(null)}
          >
            {t("later")}
          </Button>
        </aside>
      ) : null}

      {draftGateOpen ? (
        <aside
          className="bg-card flex flex-wrap items-center gap-2 rounded-md border p-2 shadow-sm"
          role="alert"
        >
          <span className="text-sm">{t("editingDraftUpdate")}</span>
          <Button type="button" size="sm" onClick={finishEditing}>
            {t("finishEditing")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => void discardAndReload()}
          >
            {t("discardDraftReload")}
          </Button>
        </aside>
      ) : null}
    </>
  );
}
