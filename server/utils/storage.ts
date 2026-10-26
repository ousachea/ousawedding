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
  // A GitHub token turns on GitHub storage, also in local development
  storage ??= useRuntimeConfig().github.token ? createGithubStorage()
    : useDriver() === 'local' ? createLocalStorage()
      : createFirebaseStorage()
  return storage
}

/**
 * Photos committed to a GitHub repo (public/uploads/ on the configured branch) and served by the jsDelivr CDN.
 * The returned URL is pinned to the upload's commit, so it works at once and never changes.
 */
function createGithubStorage(): FileStorage {
  const { token, repo, branch, folder } = useRuntimeConfig().github
  const api = (path: string) => `https://api.github.com/repos/${repo}/contents/${folder}/${path}`
  const headers = { 'authorization': `Bearer ${token}`, 'accept': 'application/vnd.github+json', 'user-agent': 'ousawedding' }
  // One commit at a time: parallel commits to the same branch make GitHub answer 409
  let queue: Promise<unknown> = Promise.resolve()
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn, fn)
    queue = run.catch(() => {})
    return run
  }
  async function call(method: string, path: string, body?: object, tries = 3): Promise<Response> {
    const res = await fetch(api(path), { method, headers, body: body && JSON.stringify(body) })
    // The branch moved under us (another upload, a push): try again on the new head
    if ((res.status === 409 || res.status === 422) && tries > 1 && method !== 'GET') return call(method, path, body, tries - 1)
    if (!res.ok && res.status !== 404) {
      throw createError({ statusCode: 502, statusMessage: `GitHub storage: ${res.status} ${(await res.text()).slice(0, 200)}` })
    }
    return res
  }
  return {
    put: (path, data) => serial(async () => {
      const res = await call('PUT', path, { message: `Upload photo ${path}`, content: data.toString('base64'), branch })
      const { commit } = await res.json() as { commit: { sha: string } }
      return `https://cdn.jsdelivr.net/gh/${repo}@${commit.sha}/${folder}/${path}`
    }),
    remove: path => serial(async () => {
      const res = await call('GET', `${path}?ref=${encodeURIComponent(branch)}`)
      if (res.status === 404) return
      const { sha } = await res.json() as { sha: string }
      await call('DELETE', path, { message: `Remove photo ${path}`, sha, branch })
    }),
  }
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
