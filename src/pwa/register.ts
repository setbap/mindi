export interface PwaRegistrationCallbacks {
  onOfflineReady: () => void;
  onNeedRefresh: (update: (reloadPage?: boolean) => Promise<void>) => void;
}

export async function registerPwa({
  onOfflineReady,
  onNeedRefresh,
}: PwaRegistrationCallbacks): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  try {
    const { registerSW } = await import("./register-client");
    let update: (reloadPage?: boolean) => Promise<void> = async () => {};
    update = registerSW({
      immediate: true,
      onOfflineReady,
      onNeedRefresh: () => onNeedRefresh(update),
      onRegisterError: () => {
        // PWA support is progressive: an unavailable worker stays quiet.
      },
    });
  } catch {
    // Unsupported or failed PWA setup must leave the normal app usable.
  }
}
