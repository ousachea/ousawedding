import { promises as fs } from 'node:fs'
import { extname } from 'node:path'

// Serves uploaded photos for the local driver. Firebase serves its own files.
export default defineEventHandler(async (event) => {
  if (useDriver() !== 'local') throw createError({ statusCode: 404 })
  const types: Record<string, string> = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' }
  const path = getRouterParam(event, 'path')!
  try {
    const data = await fs.readFile(localUploadPath(path))
    setResponseHeader(event, 'content-type', types[extname(path)] ?? 'application/octet-stream')
    setResponseHeader(event, 'cache-control', 'public, max-age=31536000, immutable')
    return data
  } catch {
    throw createError({ statusCode: 404 })
  }
})
