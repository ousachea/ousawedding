import { z } from 'zod'

// Resolves a personal invitation token. Called from the browser, so guest names never
// appear in server-rendered or cached HTML.
export default defineEventHandler(async (event): Promise<ResolvedInvitation> => {
  rateLimit(event, 'invite', 30, 60_000)
  const { slug, token } = await readBody$(event, z.object({ slug: z.string().max(100), token: z.string().max(100) }))
  const wedding = await findWeddingBySlug(slug)
  const found = wedding && (wedding.published || (await getAdmin(event))) ? await findInvitation(wedding, token) : null
  if (!wedding || !found) throw invalidInvitation()

  const { invitation, guest } = found
  const rsvp = await useDb().get<Rsvp>('rsvps', guest.id)
  if (!invitation.viewedAt) {
    const now = nowIso()
    await useDb().update('invitations', invitation.id, {
      viewedAt: now,
      updatedAt: now,
      ...(invitation.status === 'draft' || invitation.status === 'sent' ? { status: 'viewed' } : {}),
    })
  }
  return {
    guestName: guest.name,
    maxAttendees: guest.maxAttendees,
    locale: invitation.locale,
    rsvp: rsvp && { attending: rsvp.attending, count: rsvp.count, attendeeNames: rsvp.attendeeNames, dietary: rsvp.dietary, message: rsvp.message, updatedAt: rsvp.updatedAt },
    canEdit: !deadlinePassed(wedding) && (!rsvp || wedding.rsvp.allowUpdates),
  }
})
