import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const invitation = await requireChild<Invitation>('invitations', getRouterParam(event, 'invitationId')!, wedding.id)
  const body = await readBody$(event, z.object({
    status: z.enum(['draft', 'sent', 'revoked']).optional(),
    locale: z.enum(['km', 'en']).optional(),
  }))
  if (invitation.status === 'revoked') throw createError({ statusCode: 409, statusMessage: 'Invitation is revoked' })
  const now = nowIso()
  // Marking "sent" never moves an invitation backwards from viewed/responded
  const status = body.status === 'sent' && ['viewed', 'responded'].includes(invitation.status) ? invitation.status : body.status
  const updated: Invitation = {
    ...invitation,
    ...(status && { status }),
    ...(body.locale && { locale: body.locale }),
    ...(status === 'revoked' && { revokedAt: now }),
    updatedAt: now,
  }
  await useDb().set('invitations', invitation.id, updated)
  const token = decryptToken(updated.tokenEnc)
  return { ...updated, tokenHash: undefined, tokenEnc: undefined, url: token && status !== 'revoked' ? inviteUrl(event, wedding, token, updated.locale) : '' }
})
