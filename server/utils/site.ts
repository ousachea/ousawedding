// The business page's details, one document in content/site.json; defaults until saved from the admin
export const DEFAULT_SITE: SiteInfo = {
  name: 'Theab Online',
  tagline: { en: '', km: '' },
  about: { en: '', km: '' },
  phone: '',
  telegram: '',
  facebook: '',
  email: '',
}

export async function getSite(): Promise<SiteInfo> {
  return { ...DEFAULT_SITE, ...await useDb().get<SiteInfo>('site', 'main') }
}
