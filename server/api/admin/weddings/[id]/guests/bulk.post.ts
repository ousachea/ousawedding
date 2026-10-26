import { z } from 'zod'

export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  const body = await readBody$(event, z.object({
    ids: z.array(z.string().max(64)).min(1).max(1000),
    action: z.enum(['archive', 'restore', 'setGroup', 'setSide']),
    group: z.string().trim().max(60).optional(),
    side: z.enum(['bride', 'groom', 'both']).optional(),
  }))
  const guests = (await useDb().where<Guest>('guests', 'weddingId', wedding.id)).filter(g => body.ids.includes(g.id))
  const now = nowIso()
  const patch = {
    archive: { archived: true },
    restore: { archived: false },
    setGroup: { group: body.group ?? '' },
    setSide: { side: body.side ?? 'both' },
  }[body.action]
  await useDb().setMany('guests', guests.map(g => ({ id: g.id, data: { ...patch, updatedAt: now } })))
  return { ok: true, updated: guests.length }
})
