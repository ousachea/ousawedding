import { promises as fs } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { randomUUID } from 'node:crypto'
import { getStorage } from 'firebase-admin/storage'

export interface FileStorage {
  /** Stores the file and returns a public URL for it. */
  put(path: string, data: Buffer, contentType: string): Promise<string>
  remove(path: string): Promise<void>
}

let storage: FileStorage | undefined

export function useFileStorage(): FileStorage {
  storage ??= useDriver() === 'local' ? createLocalStorage() : createFirebaseStorage()
  return storage
}

function createFirebaseStorage(): FileStorage {
  const bucket = () => getStorage(useFirebaseApp()).bucket()
  return {
    async put(path, data, contentType) {
      // A download token URL serves the file without opening the bucket to public reads,
      // so storage.rules can deny all client access.
      const token = randomUUID()
      await bucket().file(path).save(data, {
        resumable: false,
        metadata: {
          contentType,
          cacheControl: 'public, max-age=31536000, immutable',
          metadata: { firebaseStorageDownloadTokens: token },
        },
      })
      return `https://firebasestorage.googleapis.com/v0/b/${bucket().name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`
    },
    async remove(path) {
      await bucket().file(path).delete({ ignoreNotFound: true })
    },
  }
}

export function localUploadPath(path: string): string {
  const root = join(useRuntimeConfig().localDataDir, 'uploads')
  const full = normalize(join(root, path))
  if (!full.startsWith(root)) throw createError({ statusCode: 400, statusMessage: 'Bad path' })
  return full
}

function createLocalStorage(): FileStorage {
  return {
    async put(path, data) {
      const full = localUploadPath(path)
      await fs.mkdir(dirname(full), { recursive: true })
      await fs.writeFile(full, data)
      return `/api/uploads/${path}`
    },
    async remove(path) {
      await fs.rm(localUploadPath(path), { force: true })
    },
  }
}
