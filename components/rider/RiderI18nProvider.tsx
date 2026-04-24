'use client';

import {
  DEFAULT_RIDER_LOCALE,
  getRiderMessages,
  normalizeRiderLocale,
  type RiderLocale,
  type RiderMessages,
} from '@/lib/i18n/rider';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

type RiderI18nContextValue = {
  locale: RiderLocale;
  messages: RiderMessages;
  setLocale: (locale: RiderLocale) => void;
};

const RiderI18nContext = createContext<RiderI18nContextValue | null>(null);

export function RiderI18nProvider({
  locale,
  children,
}: {
  locale?: string | null;
  children: ReactNode;
}) {
  const [currentLocale, setCurrentLocale] = useState<RiderLocale>(normalizeRiderLocale(locale));

  const value = useMemo<RiderI18nContextValue>(
    () => ({
      locale: currentLocale,
      messages: getRiderMessages(currentLocale),
      setLocale: setCurrentLocale,
    }),
    [currentLocale],
  );

  return <RiderI18nContext.Provider value={value}>{children}</RiderI18nContext.Provider>;
}

export function useRiderI18n(): RiderI18nContextValue {
  const value = useContext(RiderI18nContext);
  if (!value) {
    return {
      locale: DEFAULT_RIDER_LOCALE,
      messages: getRiderMessages(DEFAULT_RIDER_LOCALE),
      setLocale: () => {},
    };
  }
  return value;
}
