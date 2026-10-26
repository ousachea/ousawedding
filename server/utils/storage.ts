import { promises as fs } from 'node:fs'
import { dirname, join, normalize, resolve } from 'node:path'

export interface FileStorage {
  /** Stores the file and returns a public URL for it. */
  put(path: string, data: Buffer, contentType: string): Promise<string>
  remove(path: string): Promise<void>
}

// Uploads are plain files in public/uploads/: committed with the content and served by the static site
export function uploadPath(path: string): string {
  const root = resolve(useRuntimeConfig().uploadsDir)
  const full = normalize(join(root, path))
  if (!full.startsWith(root)) throw createError({ statusCode: 400, statusMessage: 'Bad path' })
  return full
}

let storage: FileStorage | undefined

export function useFileStorage(): FileStorage {
  storage ??= {
    async put(path, data) {
      const full = uploadPath(path)
      await fs.mkdir(dirname(full), { recursive: true })
      await fs.writeFile(full, data)
      return `/uploads/${path}`
    },
    async remove(path) {
      await fs.rm(uploadPath(path), { force: true })
    },
  }
  return storage
}
