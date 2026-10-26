import { z } from 'zod'

// Creates personal invitation links for guests. `regenerate` replaces an existing link, so the old one stops working.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const body = await readBody$(event, z.object({
    guestIds: z.array(z.string().max(64)).min(1).max(1000),
    locale: z.enum(['km', 'en']).optional(),
    regenerate: z.boolean().default(false),
  }))
  const db = useDb()
  const { guests, invitations } = await loadWeddingData(wedding.id)
  const now = nowIso()
  const created: Array<{ guestId: string, url: string }> = []

  for (const guest of guests.filter(g => body.guestIds.includes(g.id) && !g.archived)) {
    const active = invitations.find(i => i.guestId === guest.id && i.status !== 'revoked')
    if (active && !body.regenerate) continue
    if (active) await db.update('invitations', active.id, { status: 'revoked', revokedAt: now, updatedAt: now })

    const token = generateInviteToken()
    const locale = body.locale ?? active?.locale ?? wedding.defaultLocale
    const invitation: Invitation = {
      id: newId(), weddingId: wedding.id, guestId: guest.id,
      tokenHash: hashInviteToken(token), tokenEnc: encryptToken(token),
      locale, status: active?.status === 'responded' ? 'responded' : 'draft',
      expiresAt: '', viewedAt: '', revokedAt: '', createdAt: now, updatedAt: now,
    }
    await db.set('invitations', invitation.id, invitation)
    created.push({ guestId: guest.id, url: inviteUrl(event, wedding, token, locale) })
  }
  return { created }
})
