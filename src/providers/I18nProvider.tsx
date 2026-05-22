"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { type Locale, defaultLocale, getMessages } from "@/config/i18n";

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextType>({
  locale: defaultLocale,
  setLocale: () => {},
});

export const useChangeLocale = () => useContext(I18nContext);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);
  const [messages, setMessages] = useState<Record<string, any> | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load initial locale from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("vku-locale") as Locale | null;
    if (stored && (stored === "en" || stored === "vi")) {
      setLocaleState(stored);
    } else {
      // Detect browser language
      const browserLang = navigator.language.startsWith("vi") ? "vi" : "en";
      setLocaleState(browserLang as Locale);
    }
    setMounted(true);
  }, []);

  // Load messages when locale changes
  useEffect(() => {
    getMessages(locale).then(setMessages);
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("vku-locale", newLocale);
  }, []);

  // Wait for messages to load
  if (!mounted || !messages) {
    return null;
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </I18nContext.Provider>
  );
}
