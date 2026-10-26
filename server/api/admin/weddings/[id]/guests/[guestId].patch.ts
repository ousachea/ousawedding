import { z } from 'zod'

// Edits a guest; `archived` hides them from counts and invalidates their link without losing data.
export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const guest = await requireChild<Guest>('guests', getRouterParam(event, 'guestId')!, wedding.id)
  const body = await readBody$(event, guestSchema.partial().extend({ archived: z.boolean().optional() }))
  const patch = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== undefined))
  const updated: Guest = { ...guest, ...patch, updatedAt: nowIso() }
  await useDb().set('guests', guest.id, updated)
  return updated
})
