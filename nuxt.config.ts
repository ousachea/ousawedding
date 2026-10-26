export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  devServer: { port: 8000 },
  modules: ['@nuxtjs/i18n'],
  css: ['~/assets/css/tokens.css', '~/assets/css/base.css'],

  runtimeConfig: {
    // 'firebase' in production; 'local' stores data in .data/ for development and tests
    driver: process.env.NUXT_DRIVER === 'local' ? 'local' : 'firebase',
    localDataDir: '.data/local',
    localAdminPassword: '',
    // Long random strings; see .env.example
    inviteSecret: '',
    sessionSecret: '',
    firebase: {
      projectId: 'ousa-wedding',
      clientEmail: '',
      privateKey: '',
      storageBucket: 'ousa-wedding.firebasestorage.app',
    },
    public: {
      // Defaults to NUXT_DRIVER at build time so one variable configures both
      driver: process.env.NUXT_DRIVER === 'local' ? 'local' : 'firebase',
      siteUrl: '',
      defaultWeddingSlug: 'our-wedding',
      version: process.env.npm_package_version ?? '',
      commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? '').slice(0, 7),
      // Firebase web config is public by design; access is enforced on the server
      firebase: {
        apiKey: 'AIzaSyANE_wUFyGJERtYdqMNatJ0tORkW9T9NlU',
        authDomain: 'ousa-wedding.firebaseapp.com',
        projectId: 'ousa-wedding',
        appId: '1:325189616262:web:97614c50246f44111a4707',
      },
    },
  },

  i18n: {
    locales: [
      { code: 'km', language: 'km-KH', name: 'ខ្មែរ', file: 'km.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
    defaultLocale: 'km',
    strategy: 'prefix_except_default',
    detectBrowserLanguage: false,
  },

  routeRules: {
    '/admin': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    '/en/admin': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    '/admin/**': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    '/en/admin/**': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    '/api/**': { headers: { 'cache-control': 'no-store' } },
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
          href: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=Jost:wght@300;400;500&family=Noto+Sans+Khmer:wght@300;400;500&family=Noto+Serif+Khmer:wght@400;600&display=swap',
        },
      ],
    },
  },
})
