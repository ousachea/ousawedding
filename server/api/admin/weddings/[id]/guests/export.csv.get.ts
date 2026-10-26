export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const { guests, invitations, rsvps } = await loadWeddingData(wedding.id)
  const inviteByGuest = new Map(invitations.filter(i => i.status !== 'revoked').map(i => [i.guestId, i]))
  const rsvpByGuest = new Map(rsvps.map(r => [r.guestId, r]))
  const rows = guests.sort((a, b) => a.name.localeCompare(b.name)).map((g) => {
    const inv = inviteByGuest.get(g.id)
    const r = rsvpByGuest.get(g.id)
    const token = inv && decryptToken(inv.tokenEnc)
    return {
      name: g.name, side: g.side, group: g.group, household: g.householdId, allowed: g.maxAttendees,
      phone: g.phone, email: g.email, archived: g.archived ? 'yes' : '', notes: g.notes,
      invitation_status: inv?.status ?? 'none', invitation_link: token ? inviteUrl(event, wedding, token, inv.locale) : '',
      rsvp: r ? (r.attending ? 'attending' : 'declined') : 'pending', attending_count: r?.count ?? '',
    }
  })
  return sendCsv(event, `${wedding.slug}-guests.csv`, rows)
})
