import { readFileSync } from 'node:fs'

// Pages to build for each wedding in content/: the invitation in both languages and its calendar files
function weddingRoutes() {
  let slugs: string[] = []
  try {
    slugs = Object.values(JSON.parse(readFileSync('content/weddings.json', 'utf8')) as Record<string, { slug: string }>).map(w => w.slug)
  } catch {}
  return ['/', ...slugs.flatMap(s => [`/${s}`, `/km/${s}`, `/api/public/weddings/${s}/events/all.ics`, `/api/public/weddings/${s}/events/all-en.ics`])]
}

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  // Look for a newer deploy every 10 minutes (default: hourly); AppUpdateBanner then offers a refresh
  experimental: { checkOutdatedBuildInterval: 10 * 60_000 },
  // Reachable from other devices on the same network (e.g. a tablet)
  devServer: { port: 8000, host: '0.0.0.0' },
  modules: ['@nuxtjs/i18n'],
  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],

  runtimeConfig: {
    // Published content (wedding, schedule, gallery): committed, read when the static site is built
    contentDir: 'content',
    // Private data (the guest list): stays on your computer, git ignores it
    localDataDir: '.data/local',
    // Uploaded photos (public/ is served as-is by the site)
    uploadsDir: 'public/uploads',
    // Admin sign-in on your computer; see .env.example
    localAdminPassword: '',
    sessionSecret: '',
    public: {
      // The live address, used in personal invitation links, QR codes and share previews.
      // Each host's build uses its own address (Netlify sets URL, Vercel its production domain), so link previews
      // on either site point at that site; never http://localhost. NUXT_PUBLIC_SITE_URL overrides it.
      siteUrl: process.env.URL
        ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://ousawedding.vercel.app'),
      defaultWeddingSlug: 'ousa-kanha',
      version: process.env.npm_package_version ?? '',
      commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.COMMIT_REF ?? '').slice(0, 7),
    },
  },

  i18n: {
    locales: [
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
      { code: 'km', language: 'km-KH', name: 'ខ្មែរ', file: 'km.json' },
    ],
    defaultLocale: 'en',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: false,
  },

  routeRules: {
    // The admin is English only
    '/admin': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    '/admin/**': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    '/km/admin': { redirect: '/admin' },
    '/km/admin/**': { redirect: '/admin/**' },
    '/en/admin': { redirect: '/admin' },
    '/en/admin/**': { redirect: '/admin/**' },
    // Old invitation links (query string, e.g. ?invite=, is kept). English used to live under /en.
    '/wedding/**': { redirect: { to: '/**', statusCode: 301 } },
    '/en/**': { redirect: { to: '/**', statusCode: 301 } },
  },

  // The published site is static: every invitation page is built ahead of time from content/.
  // The admin and its API exist only when you run `npm run dev` on your computer.
  hooks: {
    // The admin trusts x-forwarded-for to tell visits from this computer apart (server/utils/auth.ts).
    // Set it from the real connection so another device cannot claim to be localhost.
    listen(server) {
      server.prependListener('request', (req) => {
        req.headers['x-forwarded-for'] = req.socket.remoteAddress ?? ''
      })
    },
    'pages:extend'(pages) {
      if (process.env.NODE_ENV !== 'production') return
      for (let i = pages.length - 1; i >= 0; i--) if (pages[i]!.path.startsWith('/admin')) pages.splice(i, 1)
    },
  },
  nitro: {
    prerender: { crawlLinks: true, routes: weddingRoutes() },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'km' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Great+Vibes&family=Jost:wght@300;400;500&family=Noto+Sans+Khmer:wght@300;400;500&family=Noto+Serif+Khmer:wght@400;600&display=swap',
        },
      ],
    },
  },
})
