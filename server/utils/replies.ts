import { replyKey, type Reply, type ReplyStore } from '~~/shared/rsvp'

/** Replies sent to the dev server (trying the invitation on this computer), kept in .data/local/ */
export function localReplies(): ReplyStore {
  return {
    async save(slug, reply) {
      const id = replyKey(slug, reply.name)
      const before = await useDb().get('replies', id)
      await useDb().set('replies', id, { ...reply, slug })
      return !!before
    },
    list: slug => useDb().where<Reply>('replies', 'slug', slug),
  }
}

/**
 * The live site's replies, fetched with REPLIES_KEY (netlify/functions/replies.ts). `null` when that isn't
 * set up: no key, or the site address is this computer.
 */
export function liveReplies() {
  const key = process.env.REPLIES_KEY
  const site = (useRuntimeConfig().public.siteUrl || '').replace(/\/$/, '')
  if (!key || !/^https:\/\//.test(site)) return null
  const call = (query: Record<string, string>, method: 'GET' | 'DELETE' = 'GET') =>
    $fetch<Reply[]>(`${site}/api/replies`, { method, query, headers: { authorization: `Bearer ${key}` }, timeout: 15_000 })
  return {
    list: (slug: string) => call({ slug }),
    remove: (slug: string, name: string) => call({ slug, name }, 'DELETE'),
  }
}
