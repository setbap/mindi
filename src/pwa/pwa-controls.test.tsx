import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/i18n/i18n-context";
import {
  PwaControls,
  type PwaRegistration,
  type PwaRegistrationCallbacks,
} from "./pwa-controls";

function renderControls(
  options: {
    editing?: boolean;
    onDiscardDraft?: () => void;
  } = {},
) {
  let callbacks: PwaRegistrationCallbacks | undefined;
  const register: PwaRegistration = vi.fn(async (value) => {
    callbacks = value;
  });
  render(
    <I18nProvider language="en">
      <PwaControls
        editing={options.editing ?? false}
        onDiscardDraft={options.onDiscardDraft ?? vi.fn()}
        register={register}
      />
      <Toaster />
    </I18nProvider>,
  );
  return {
    callbacks: () => callbacks!,
    register,
  };
}

describe("PwaControls", () => {
  it("shows installation only after browser eligibility and dismisses it for the session", async () => {
    const user = userEvent.setup();
    const { callbacks, register } = renderControls();
    expect(callbacks()).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Install Mindi" }),
    ).not.toBeInTheDocument();

    const prompt = vi.fn(async () => {});
    const eligible = new Event("beforeinstallprompt", {
      cancelable: true,
    });
    Object.assign(eligible, { prompt });
    act(() => window.dispatchEvent(eligible));

    await user.click(screen.getByRole("button", { name: "Not now" }));
    expect(prompt).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Install Mindi" }),
    ).not.toBeInTheDocument();
    expect(register).toHaveBeenCalledOnce();
  });

  it("invokes the browser install prompt only from the eligible control", async () => {
    const user = userEvent.setup();
    renderControls();
    const prompt = vi.fn(async () => {});
    const eligible = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(eligible, { prompt });
    act(() => window.dispatchEvent(eligible));

    await user.click(screen.getByRole("button", { name: "Install Mindi" }));

    expect(prompt).toHaveBeenCalledOnce();
  });

  it("announces offline readiness only from the service-worker callback", async () => {
    const { callbacks } = renderControls();

    expect(
      screen.queryByText("Mindi is ready to work offline"),
    ).not.toBeInTheDocument();
    act(() => callbacks().onOfflineReady());

    expect(
      await screen.findByText("Mindi is ready to work offline"),
    ).toBeInTheDocument();
  });

  it("requires an explicit draft decision before applying an update", async () => {
    const user = userEvent.setup();
    const discardDraft = vi.fn();
    const update = vi.fn(async () => {});
    const { callbacks } = renderControls({
      editing: true,
      onDiscardDraft: discardDraft,
    });

    act(() => callbacks().onNeedRefresh(update));
    await user.click(screen.getByRole("button", { name: "Reload update" }));

    expect(update).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Finish editing" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Discard draft and reload" }),
    );

    expect(discardDraft).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith(true);
  });

  it("keeps the current version on Later and reloads only on explicit choice", async () => {
    const user = userEvent.setup();
    const update = vi.fn(async () => {});
    const { callbacks } = renderControls();

    act(() => callbacks().onNeedRefresh(update));
    await user.click(screen.getByRole("button", { name: "Later" }));
    expect(update).not.toHaveBeenCalled();
    expect(screen.queryByText("Update ready")).not.toBeInTheDocument();

    act(() => callbacks().onNeedRefresh(update));
    await user.click(screen.getByRole("button", { name: "Reload update" }));
    expect(update).toHaveBeenCalledWith(true);
  });
});
