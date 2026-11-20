# ousawedding

Online wedding invitations in Khmer and English for many couples, built with Nuxt 4. The site's home page introduces the service (Theab Online); each couple's invitation lives at its own address, e.g. `/sokha-dara`.

- **Live site:** https://theab-online.netlify.app. Netlify rebuilds it on every push.
- **Admin:** http://localhost:8000/admin. It only runs on your computer and walks you through seven steps: couple, schedule, photos, words and music, look, replies and gifts, share.

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
| `content/` | weddings, schedules, galleries, the business page | yes |
| `public/uploads/` | photos | yes |
| `.data/local/guests.json` | guest list | **no**, it stays on your computer |

## Couples

Every couple is a wedding in the admin, with its own address, details, photos, style and Telegram chat.

1. In the admin sidebar, under **Couple**, press **+ New couple** and give their address (e.g. `sokha-dara`). They start from sample details (Dara & Sophea).
2. Go through the seven steps for them. The **Couple** menu at the top of the sidebar switches between couples.
3. Push. Their invitation is live at `https://theab-online.netlify.app/sokha-dara`, and their guests' links work as in *Personal links*.

The site's home page is your business page. Edit its name, tagline and contacts in the admin under **Business page** (saved in `content/site.json`); contacts left empty are not shown.

## RSVP

Guests reply on the invitation, and each reply is sent on Telegram to the couple. They also get a message the first time a guest opens their personal link (once per phone or browser). Every message is headed with the couple's names and ends with a link to the guest's invitation.

One bot serves every couple. Set it up once:

1. Create a bot with @BotFather and send it a message.
2. Find your own chat ID at `https://api.telegram.org/bot<token>/getUpdates`.
3. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (yours) in `.env` and in Netlify (Site configuration → Environment variables).

Then for each couple, in step 6, **Replies and gifts → Telegram alerts**: ask the couple to open the bot in Telegram and press Start, press **Find**, and tap their name. A couple without a chat sends their alerts to you. Their chat ID is saved with their wedding (in `content/`, so public on GitHub) but never sent to guests' browsers.

To use a Google Form instead, paste its link in step 6, **Replies and gifts**. Replies close at the RSVP deadline.

## Personal links

Step 7, **Share**, makes a link for any name. You can also type one: add the name after the address, with no spaces. Add `/km` for Khmer.

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

Add up to four KHQR images in step 6, **Replies and gifts**. The section stays hidden until you add one.

## Checks

```sh
npm run typecheck
npm run build:server && npm test
npm run build
```

## Privacy and backups

- The repository is public. Only what the invitation shows is committed.
- Pages are hidden from search engines unless you turn indexing on in step 7, **Share**.
- Your content is in git. **Share → Download backup** downloads everything, including the guest list, so keep that file private.
