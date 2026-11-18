# ousawedding

A wedding invitation website in Khmer and English, built with Nuxt 4.

- **Live site:** https://theab-online.netlify.app. Netlify rebuilds it on every push.
- **Admin:** http://localhost:8000/admin. It only runs on your computer.

## Run it

Needs Node 22.21+, 24.11+ or 26+.

```sh
npm install
cp .env.example .env
npm run dev          # http://localhost:8000/admin
```

To open it from a tablet on the same Wi-Fi, run `npm run dev -- --host` and sign in with `NUXT_LOCAL_ADMIN_PASSWORD`.

## Publish

Edit in the admin, then push. Netlify updates the site in about a minute.

```sh
git add content public/uploads
git commit -m "Update invitation"
git push
```

| Folder | Holds | Public? |
|---|---|---|
| `content/` | wedding, schedule, gallery | yes |
| `public/uploads/` | photos | yes |
| `.data/local/guests.json` | guest list | **no**, it stays on your computer |

## RSVP

Guests reply on the invitation, and each reply is sent to you on Telegram.

1. Create a bot with @BotFather and send it a message.
2. Find your chat ID at `https://api.telegram.org/bot<token>/getUpdates`.
3. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in `.env` and in Netlify (Site configuration → Environment variables).

To use a Google Form instead, paste its link in **Settings → RSVP**. Replies close at the RSVP deadline.

## Personal links

**Invitations** in the admin gives each guest a link and QR code. You can also type one: add the name after the address, with no spaces. Add `/km` for Khmer.

```
https://theab-online.netlify.app/ousa-kanha/MrCheaOusa
https://theab-online.netlify.app/km/ousa-kanha/MrCheaOusa
```

The name is split at capital letters (`CheaOusa` → Chea Ousa), or at dashes (`chea-ousa`). A title at the start is translated:

| In the link | English | Khmer |
|---|---|---|
| `Mr` | Mr. | លោក |
| `Mrs` | Mrs. | លោកស្រី |
| `MrAndMrs` | Mr. & Mrs. | លោក និងលោកស្រី |
| `Ms` | Ms. | អ្នកនាង |
| `Miss` | Miss | កញ្ញា |
| `Dr` | Dr. | បណ្ឌិត |
| `HE` | H.E. | ឯកឧត្តម |
| `HEAndLokChumteav` | H.E. & Lok Chumteav | ឯកឧត្តម និងលោកជំទាវ |
| `LokChumteav` | Lok Chumteav | លោកជំទាវ |
| `Oknha` | Oknha | អ្នកឧកញ៉ា |
| `OknhaAndLokChumteav` | Oknha & Lok Chumteav | អ្នកឧកញ៉ា និងលោកជំទាវ |
| `Samdech` | Samdech | សម្តេច |
| `LokKru` | Lok Kru | លោកគ្រូ |
| `NeakKru` | Neak Kru | អ្នកគ្រូ |

Use `MrAndMrs`, not `Mr&Mrs`, because a `&` can break the link.

## Wedding gift

Add up to four KHQR images in **Settings → Wedding gift**. The section stays hidden until you add one.

## Checks

```sh
npm run typecheck
npm run build:server && npm test
npm run build
```

## Privacy and backups

- The repository is public. Only what the invitation shows is committed.
- Pages are hidden from search engines unless you turn indexing on in Settings.
- Your content is in git. **Settings → Backup** downloads everything, including the guest list, so keep that file private.
