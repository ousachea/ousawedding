// Guests' replies on the live site, kept in Netlify Blobs (a store that comes with every Netlify site).
// Outside netlify/functions/, so Netlify doesn't take this file for a function of its own.
import { getStore } from '@netlify/blobs'
import { replyKey, type Reply, type ReplyStore } from '../../shared/rsvp.ts'

// Strong consistency: a reply is in the list the moment it is saved, so the total in its alert counts it
const blobs = () => getStore({ name: 'replies', consistency: 'strong' })

export function blobReplies(): ReplyStore {
  return {
    async save(slug, reply) {
      const store = blobs()
      const key = replyKey(slug, reply.name)
      const before = await store.get(key)
      await store.setJSON(key, reply)
      return before !== null
    },
    async list(slug) {
      const store = blobs()
      const { blobs: found } = await store.list({ prefix: `${slug}/` })
      const replies = await Promise.all(found.map(b => store.get(b.key, { type: 'json' }) as Promise<Reply | null>))
      return replies.filter((r): r is Reply => !!r)
    },
  }
}

export const deleteReply = (slug: string, name: string) => blobs().delete(replyKey(slug, name))
