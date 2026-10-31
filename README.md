# ousawedding

A Khmer and English wedding invitation website, published as a **static site** (no server, no database). Built with Nuxt 4. You edit everything in an admin dashboard that runs only on your computer; pushing your changes rebuilds the site on Vercel or Netlify.

- Invitation: `/<slug>` (English) and `/km/<slug>` (Khmer), e.g. `/ousa-kanha`. The site root opens the default wedding; old `/wedding/<slug>` links redirect.
- Personal link: `/<slug>?to=<guest name>`: the envelope greets the guest by name.
- RSVP: a "Reply now" button that opens your Google Form (or any form) until the deadline.
- Admin (on your computer only): `http://localhost:8000/admin`

## Live site

- **https://ousawedding.vercel.app**: Vercel builds the static site from this repository on every push (Netlify works the same way; see *Publish*).
- **GitHub Pages:** https://ousachea.github.io/ousawedding/ shows the earlier one-page invitation and no longer updates.

## What guests see

- **Envelope:** a purple envelope with gold trim and a gold foil seal. Opening it raises the letter ("You are warmly invited to celebrate our wedding"), then shows the invitation from the top. The page can't scroll behind it (iPhone included). The same tap goes fullscreen where the browser allows it (Android, iPad) and asks iPhone for motion access, for the tilting flowers.
- **Cover:** the couple's names, date and cover photo, with flowers in the corners that sway and lean as the phone tilts.
- **Schedule:** grouped by day, one column on phones. The line draws down with the reader and each item's dot fills in as it is reached. Dress code with the wedding colours (the theme's purples and gold), guest information and a contact number.
- **Gallery:** a stack of up to five photos, all inside the screen, that plays on its own and loops. Swipe or tap a side photo to move; tap the middle one for full screen.
- **Around the page:** falling petals, butterflies in random pastel tints that gather around a finger on phones and tablets, and still greenery down both sides.
- **Navigation:** a slim top bar (monogram, music, language) and a floating gold bottom bar with an icon per section. Both tuck away while scrolling down and come back when scrolling up.
- Visitors who turn on *reduce motion* get the same page without the animations.

### Share previews

Each invitation has full share and search tags: the cover photo, the title, and the share text followed by the date and time, in Khmer or English. Settings → *Link preview* shows how the link will look in chat apps and in Google while you type.

## Screenshots

Taken from an earlier version with sample data: the envelope is now purple and gold, the gallery is a stack of photos, and the sections are in a bottom bar.

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

## Run locally and edit

```sh
npm install --no-bin-links   # --no-bin-links is only needed on Android shared storage
cp .env.example .env         # admin password (for other devices) and the live site address
npm run dev                  # http://localhost:8000/admin
```

On the computer running `npm run dev`, `http://localhost:8000/admin` opens without a password. The dev server can also be reached from other devices on the same network (for example a tablet); those sign in with `NUXT_LOCAL_ADMIN_PASSWORD`.

The admin saves to files in the project:

| Where | What | Published? |
|---|---|---|
| `content/` | wedding, schedule, gallery (`weddings.json`, `events.json`, `gallery.json`) | yes, committed |
| `public/uploads/` | uploaded photos | yes, committed |
| `.data/local/guests.json` | guest list (names, phones, notes) | **no**: git ignores it, so it never reaches the public repository |

When there is no content yet, the app starts with sample content.

## Publish

Commit and push the content; Vercel or Netlify rebuilds the static site (about a minute):

```sh
git add content public/uploads
git commit -m "Update invitation"
git push
```

`npm run build` generates every page into static files (Vercel detects this automatically; `netlify.toml` tells Netlify to publish `dist/`). The live address, used in share previews, personal links and calendar files, defaults to `https://ousawedding.vercel.app` in `nuxt.config.ts`; set `NUXT_PUBLIC_SITE_URL` on the host to use another. No other settings or secrets are needed.

Uploaded photos are named by a unique ID and never change, so `vercel.json` and `netlify.toml` let browsers cache them for a year; pages are always re-checked, so changes show up straight away.

### RSVP replies

Create a Google Form (name, attending, number of guests, message…), paste its link in **Settings → RSVP**, and replies collect in the form's Google Sheet. The invitation shows the button until the RSVP deadline.

### Personal links

**Invitations** lists a link and QR code per guest (Khmer or English), with printable cards. A link is just the invitation address plus the guest's name, so nothing is tracked and anyone with a link can see the name in it.

### Checks

```sh
npm run typecheck
npm run build:server && npm test   # admin API + server-rendered pages, plus timezone unit tests
npm run build                      # the static site, into .output/public (dist/ on Netlify)
```

## How it's built

```
app/
  pages/[slug].vue                 Public invitation (one scrolling page)
  pages/admin/*                    Dashboard, guests, invitations (+ print), schedule, gallery, theme, settings
  components/wedding/*             Envelope, hero, countdown, schedule, gallery, flowers, petals, butterflies,
                                   greenery, RSVP, top bar and bottom bar…
  components/admin/*               Live preview, link preview, modal, QR code, bilingual field, stat card
  composables/*                    Shared page state (e.g. hiding the bars while scrolling)
i18n/locales/{km,en}.json          Interface text
server/
  api/public/*                     Wedding content and calendar files (.ics), read when the site is built
  api/admin/*, api/auth/*          The admin dashboard's API (on your computer only)
  utils/db.ts                      JSON files: content/ (public) and .data/local/ (private)
  utils/storage.ts                 Photo uploads into public/uploads/
shared/                            Types, timezone, link and share-preview helpers used by both sides
content/                           The published wedding content
tests/                             node:test suites
```

Wedding content is stored in both languages; interface text is in the locale files. English is the default language, and Khmer lives under `/km`; old `/en/` links redirect.

### Privacy

- The repository is public, so only what the invitation shows is committed. The guest list stays on your computer.
- Guest names in personal links are read in the browser; the pages themselves are the same files for everyone. Pages are `noindex` unless you turn indexing on in Settings.
- Uploads are checked by their real file type, size-capped and resized in the browser.

### Backups

Your content is in git. Settings → Backup also downloads one JSON file with the wedding, schedule, gallery and guest list (keep that file private).
