// Guest list joined with each guest's invitation and RSVP, for the admin table.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const { guests, invitations, rsvps } = await loadWeddingData(wedding.id)
  const inviteByGuest = new Map(invitations.filter(i => i.status !== 'revoked').map(i => [i.guestId, i]))
  const rsvpByGuest = new Map(rsvps.filter(r => r.guestId).map(r => [r.guestId, r]))
  return {
    guests: guests.map((g) => {
      const inv = inviteByGuest.get(g.id)
      const rsvp = rsvpByGuest.get(g.id)
      return {
        ...g,
        invitation: inv ? { id: inv.id, status: inv.status, locale: inv.locale, viewedAt: inv.viewedAt, url: linkFor(inv) } : null,
        rsvp: rsvp ? { attending: rsvp.attending, count: rsvp.count, attendeeNames: rsvp.attendeeNames, dietary: rsvp.dietary, message: rsvp.message, source: rsvp.source, updatedAt: rsvp.updatedAt } : null,
      }
    }),
    // Replies through the optional open RSVP form, not tied to a guest
    general: rsvps.filter(r => r.source === 'general'),
  }

  function linkFor(inv: Invitation) {
    const token = decryptToken(inv.tokenEnc)
    return token ? inviteUrl(event, wedding, token, inv.locale) : ''
  }
})
