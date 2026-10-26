/** Picks the current-language text from a { km, en } value, falling back to the other language when empty. */
export function useLocalized() {
  const { locale } = useI18n()
  return (value: Localized | undefined | null) => {
    if (!value) return ''
    const current = locale.value as Locale
    return value[current] || value[current === 'km' ? 'en' : 'km'] || ''
  }
}

export function useLocaleCode() {
  const { locale } = useI18n()
  return computed(() => locale.value as Locale)
}
