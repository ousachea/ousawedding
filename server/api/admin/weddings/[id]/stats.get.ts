export default defineEventHandler(async (event) => {
  const { wedding } = await requireWedding(event)
  return computeStats(await loadWeddingData(wedding.id))
})
