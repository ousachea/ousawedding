import { replyKey, type Reply } from '~~/shared/rsvp'

// The couple's replies: those from the live site and any sent to the dev server, newest first.
// `live` says whether the live site's replies are in: 'ok', 'off' (REPLIES_KEY not set) or 'failed'.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const local = await localReplies().list(wedding.slug)
  const remote = liveReplies()
  let live: 'ok' | 'off' | 'failed' = remote ? 'ok' : 'off'
  let fromLive: Reply[] = []
  if (remote) {
    try { fromLive = await remote.list(wedding.slug) } catch { live = 'failed' }
  }
  // The same guest in both: the later reply counts
  const byName = new Map<string, Reply & { live: boolean }>()
  for (const r of [...local.map(r => ({ ...r, live: false })), ...fromLive.map(r => ({ ...r, live: true }))]) {
    const key = replyKey(wedding.slug, r.name)
    const seen = byName.get(key)
    if (!seen || seen.at < r.at) byName.set(key, r)
  }
  const replies = [...byName.values()]
    .map(({ name, attending, guests, phone, message, at, live }) => ({ name, attending, guests, phone, message, at, live }))
    .sort((a, b) => b.at.localeCompare(a.at))
  return { replies, live }
})
