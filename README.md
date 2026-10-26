# ousawedding

A Khmer and English wedding invitation website with personal invitation links, RSVPs and a private admin dashboard. Built with Nuxt 4. Data lives in Firebase (Firestore, Authentication, Storage), and the app runs on Vercel.

- Guest invitation: `/<slug>` (Khmer) and `/en/<slug>` (English), e.g. `/ousa-kanha`. The site root redirects to the default wedding; old `/wedding/<slug>` links redirect.
- Personal link: `/<slug>?invite=<token>`
- Admin: `/admin`

Everything shown when you first run the app is **sample data** (Sokha & Dara, placeholder venues and photos). Edit it in the admin dashboard before sending invitations; a banner says so until you do.

## Live site

- **GitHub Pages:** https://ousachea.github.io/ousawedding/. This still shows the earlier one-page invitation and no longer updates: GitHub Pages only hosts static files, and this app needs a server for invitation links, RSVPs and the admin dashboard.
- **Vercel:** the new app's address will be added here after the first deploy (see *Deploy to Vercel*).

## Screenshots

Taken from the app running with sample data.

### Guest invitation (phone)

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/envelope.png" width="220" alt="Envelope with a red wax seal and the guest's name, with Open invitation and Skip buttons"><br>Envelope with the guest's name</td>
    <td align="center"><img src="docs/screenshots/hero-khmer.png" width="220" alt="Khmer invitation with the couple's names, date and RSVP button"><br>Invitation in Khmer</td>
    <td align="center"><img src="docs/screenshots/hero-english.png" width="220" alt="The same invitation in English"><br>Invitation in English</td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/schedule.png" width="220" alt="Schedule timeline with event cards, directions and add-to-calendar buttons"><br>Schedule with directions and calendar</td>
    <td align="center"><img src="docs/screenshots/rsvp-form.png" width="220" alt="RSVP form for a named guest with attendance choice, guest count and names"><br>Personal RSVP form</td>
    <td align="center"><img src="docs/screenshots/rsvp-success.png" width="220" alt="RSVP confirmation message with a Change my response button"><br>RSVP confirmation</td>
  </tr>
  <tr>
    <td align="center"><img src="docs/screenshots/gallery-viewer.png" width="220" alt="Full-screen photo viewer with previous and next buttons"><br>Photo viewer</td>
    <td align="center"><img src="docs/screenshots/admin-guests-mobile.png" width="220" alt="Admin guest list on a phone, rows shown as cards"><br>Admin guest list on a phone</td>
    <td></td>
  </tr>
</table>

### Desktop

![Invitation on desktop: names and date beside an arched cover photo](docs/screenshots/desktop.png)

### Admin dashboard

![Dashboard with guest totals, response rate and an RSVP status bar](docs/screenshots/admin-dashboard.png)

![Guest list with search, filters, RSVP and invitation status, and row actions](docs/screenshots/admin-guests.png)

<details>
<summary>Invitations page (publishing, phone preview, personal links)</summary>

![Invitations page with publish control, RSVP deadline, phone preview and the list of personal links](docs/screenshots/admin-invitations.png)

</details>

## Run locally

```sh
npm install --no-bin-links   # --no-bin-links is only needed on Android shared storage
cp .env.example .env         # local driver, no Firebase needed
npm run dev
```

With `NUXT_DRIVER=local`, data is stored as JSON in `.data/local/` and the admin login uses `NUXT_LOCAL_ADMIN_PASSWORD`. The production build refuses to start with this driver unless `ALLOW_LOCAL_DRIVER=true` (used by the tests), because serverless file systems are wiped between requests.

### Checks

```sh
npm run typecheck   # vue-tsc
npm run build
npm test            # end-to-end API tests against the build, plus timezone unit tests
```

## Firebase setup (one time)

Project: `ousa-wedding`.

1. **Authentication** → Sign-in method → enable **Email/Password**. Then Users → **Add user** for each admin.
2. **Firestore Database** → Create database (production mode, region near Cambodia such as `asia-southeast1`).
3. **Storage** → Get started. Firebase now requires the pay-as-you-go **Blaze** plan for Storage; a wedding gallery stays well inside the free quota, but you must add a billing account. Set a budget alert to be safe.
4. **Service account**: Project settings → Service accounts → **Generate new private key**. This JSON file is a full-access secret: don't commit it, don't paste it into chat, delete the download once its values are in your env settings.
5. Deploy the security rules (they deny all direct browser access; see *Security*):
   ```sh
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules,storage
   ```
6. Make yourself an owner and optionally create the sample wedding:
   ```sh
   node --env-file=.env scripts/bootstrap.ts --email you@example.com --seed
   ```
   (`.env` must contain the `NUXT_FIREBASE_*` service account values for this step.)

## Deploy to Vercel

1. Import the GitHub repo at vercel.com → New Project. Framework: Nuxt (auto-detected). Defaults for build and install are fine.
2. Environment variables (Project → Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `NUXT_DRIVER` | `firebase` |
   | `NUXT_INVITE_SECRET` | 32+ random characters. **Changing it breaks every link already sent.** |
   | `NUXT_SESSION_SECRET` | 32+ random characters |
   | `NUXT_FIREBASE_CLIENT_EMAIL` | `client_email` from the service account JSON |
   | `NUXT_FIREBASE_PRIVATE_KEY` | `private_key` from the JSON, pasted as is |
   | `NUXT_PUBLIC_SITE_URL` | Your site URL, e.g. `https://ousawedding.vercel.app` (used in invitation links and share previews) |
   | `NUXT_PUBLIC_DEFAULT_WEDDING_SLUG` | `our-wedding` (or your slug) |

   Generate secrets with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
3. Deploy, open `/admin`, sign in with your Firebase user.

The Firebase **web** config (API key, auth domain, project ID) is in `nuxt.config.ts`. It is public by design; it only lets the login page talk to Firebase Authentication.

## How it's built

```
app/
  pages/[slug].vue                 Public invitation (one scrolling page)
  pages/admin/*                    Dashboard, guests, invitations (+ print), schedule, gallery, settings
  components/wedding/*             Envelope, hero, countdown, schedule, gallery, RSVP form, navigation…
  components/admin/*               Stat card, RSVP chart, modal, QR code, bilingual field
  assets/css/tokens.css            Design tokens (colours, fonts, spacing)
i18n/locales/{km,en}.json          Interface text
server/
  api/public/*                     Wedding content, invitation lookup, RSVP, calendar (.ics)
  api/admin/*                      Everything the dashboard does (all require an admin session)
  api/auth/*                       Login (Firebase session cookie or local password), logout
  utils/db.ts                      Firestore driver + local JSON driver behind one interface
  utils/storage.ts                 Firebase Storage + local file storage
  utils/auth.ts, security.ts       Admin checks, tokens, encryption, rate limiting
shared/                            Types and timezone helpers used by both sides
firestore.rules, storage.rules     Deny-all rules
scripts/bootstrap.ts               First admin + sample data
tests/                             node:test suites
```

Wedding content (names, messages, events, captions) is stored per wedding in both languages; interface text is in the locale files. Khmer is the default language, and English lives under `/en`. Invitation links carry the guest's language.

### Data model (Firestore)

All collections are top level and every document has a `weddingId`, so one project can hold several weddings.

| Collection | Contents |
|---|---|
| `weddings` | slug, names `{km,en}`, monogram, date + IANA timezone, content `{km,en}` (message, story, dress code, guest info), cover, theme, default language, RSVP settings (deadline, updates allowed, open form, dietary question), privacy, published, music, contact, share preview text |
| `events` | title/description/venue/address `{km,en}`, start/end (local time in the wedding timezone), map URL, photo, order |
| `guests` | name, side, group, household ID, seats allowed, phone, email, private notes, archived |
| `invitations` | guest ID, `tokenHash` (HMAC-SHA256), `tokenEnc` (AES-256-GCM, so admins can copy the link again), language, status (draft, sent, viewed, responded, revoked), viewed/revoked timestamps |
| `rsvps` | document ID = guest ID (one RSVP per guest, enforced by transaction); attending, count, attendee names, dietary, message, source (invitation, admin, general). Open-form replies use `general_<id>` |
| `gallery` | storage paths and URLs (full + thumbnail), size, caption and alt text `{km,en}`, order, visible |
| `admins` | document ID = Firebase Auth UID; role (`owner` or `editor`), `weddingIds` (`*` = all) |

Queries are equality-only on one field (no composite indexes needed), with sorting done in memory, which suits wedding-sized lists.

### Security

- **No direct database or storage access from browsers.** `firestore.rules` and `storage.rules` deny everything; the Nuxt server uses the Admin SDK. Photos are served by unguessable download-token URLs.
- **Admins** sign in with Firebase Authentication. The server checks a fresh ID token, confirms the user has an `admins` document, and sets an httpOnly, `SameSite=Strict` session cookie (5 days, revocable). Every admin API call re-checks the session and that the admin may manage that wedding; child records from another wedding return 404. Cross-site writes are blocked by an Origin check.
- **Invitation tokens** are 192-bit random values. Only an HMAC hash (for lookup) and an encrypted copy (for the admin to re-copy) are stored. Revoked, expired, archived or unknown tokens all return the same generic error.
- **RSVP rules are enforced on the server**: guest seat limits, deadline in the wedding's timezone, "allow updates" setting, published state, input validation (zod). Concurrent duplicate submissions update one record.
- **Guest privacy**: guest names are fetched in the browser after the page loads, never put in server-rendered HTML or share previews. Pages are `noindex` unless you turn indexing on.
- **Rate limits** on login, invitation lookup and RSVP. These are kept in memory per server instance, so on Vercel they are approximate; add Redis/KV if you see abuse.
- **CSV exports** neutralise spreadsheet formulas in guest-entered text.
- **Uploads** are checked by magic bytes, size-capped (4 MB full, 1 MB thumbnail) and resized in the browser before upload.

### Backups

Settings → Backup downloads a JSON file with the wedding, events, gallery records, guests, invitations (tokens stay encrypted) and RSVPs. For scheduled backups use Firestore's managed export (`gcloud firestore export`). There is no in-app restore; import a backup with a small Admin SDK script if you ever need one.
