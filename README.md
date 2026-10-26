# ousawedding

Single-page wedding invitation built with Nuxt, deployed to GitHub Pages on every push to `main`:
https://ousachea.github.io/ousawedding/

Edit the wedding details in the `wedding` object at the top of `app/app.vue`.

## Development

```sh
npm install --no-bin-links   # --no-bin-links is only needed on Android shared storage
npm run dev
```

## RSVP → Google Sheet

RSVPs are sent to a Google Apps Script web app that appends each reply to a Google Sheet.

1. Create a new Google Sheet (e.g. "Wedding RSVPs").
2. In the sheet, open **Extensions → Apps Script**, replace the editor contents with
   [`google-apps-script/rsvp.gs`](google-apps-script/rsvp.gs), and save.
3. Click **Deploy → New deployment**, choose type **Web app**, and set:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, approve the permissions prompt, and copy the **Web app URL**
   (it ends in `/exec`).
5. Paste that URL into `rsvpEndpoint` in `app/app.vue`, then commit and push.

Replies appear in an `RSVPs` tab with columns Timestamp, Name, Attending, Guests and Message.

If you edit the script later, use **Deploy → Manage deployments → Edit → New version** so the
URL stays the same.
