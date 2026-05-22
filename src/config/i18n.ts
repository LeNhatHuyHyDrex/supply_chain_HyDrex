export const locales = ['en', 'vi'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export async function getMessages(locale: Locale) {
  return (await import(`../../messages/${locale}.json`)).default;
}
