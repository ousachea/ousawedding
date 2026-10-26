export default defineEventHandler(async event => (await requireWedding(event)).wedding)
