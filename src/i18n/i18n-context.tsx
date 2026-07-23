import {
  createContext,
  useContext,
  type ReactNode,
} from "react";

import type { Language } from "@/domain/types";
import { t as translate, type MessageParams } from "@/i18n/t";
import type { MessageKey } from "@/i18n/messages";

interface I18nContextValue {
  language: Language;
  t: (key: MessageKey, params?: MessageParams) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: "en",
  t: (key, params) => translate("en", key, params),
});

export function I18nProvider({
  language,
  children,
}: {
  language: Language;
  children: ReactNode;
}) {
  const value: I18nContextValue = {
    language,
    t: (key, params) => translate(language, key, params),
  };
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
