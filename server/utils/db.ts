import { promises as fs } from 'node:fs'
import { join } from 'node:path'

// Public collections (shown on the invitation) live in content/, which is committed and published.
// The guest list is private and stays in .data/local/, which git ignores (the repository is public).
export type Collection = 'weddings' | 'events' | 'gallery' | 'guests'
const PRIVATE: Collection[] = ['guests']

/**
 * Minimal document store on JSON files, one file per collection. Used by the admin on your computer;
 * the published site is static and only reads the content at build time.
 */
export interface Db {
  get<T>(col: Collection, id: string): Promise<T | null>
  where<T>(col: Collection, field: string, value: unknown): Promise<T[]>
  all<T>(col: Collection): Promise<T[]>
  set(col: Collection, id: string, data: object): Promise<void>
  update(col: Collection, id: string, patch: object): Promise<void>
  delete(col: Collection, id: string): Promise<void>
  /** Writes many documents at once (used for reorder and bulk actions). */
  setMany(col: Collection, docs: Array<{ id: string, data: object }>): Promise<void>
}

let db: Db | undefined

export function useDb(): Db {
  db ??= createFileDb()
  return db
}

function createFileDb(): Db {
  const { contentDir, localDataDir } = useRuntimeConfig()
  const dirOf = (col: Collection) => (PRIVATE.includes(col) ? localDataDir : contentDir)
  const cache = new Map<Collection, Map<string, Record<string, unknown>>>()
  let queue: Promise<unknown> = Promise.resolve()

  // Serialises every write so concurrent requests can't interleave file writes
  const exclusive = <R>(fn: () => Promise<R>): Promise<R> => {
    const run = queue.then(fn, fn)
    queue = run.catch(() => {})
    return run
  }

  async function load(col: Collection) {
    let docs = cache.get(col)
    if (!docs) {
      try {
        docs = new Map(Object.entries(JSON.parse(await fs.readFile(join(dirOf(col), `${col}.json`), 'utf8'))))
      } catch {
        docs = new Map()
      }
      cache.set(col, docs)
    }
    return docs
  }

  async function persist(col: Collection) {
    await fs.mkdir(dirOf(col), { recursive: true })
    const file = join(dirOf(col), `${col}.json`)
    await fs.writeFile(`${file}.tmp`, JSON.stringify(Object.fromEntries(await load(col)), null, 2))
    await fs.rename(`${file}.tmp`, file)
  }

  const clone = <T>(v: T): T => structuredClone(v)

  return {
    async get(col, id) {
      const doc = (await load(col)).get(id)
      return doc ? clone(doc) as never : null
    },
    async all(col) {
      return [...(await load(col)).values()].map(clone) as never
    },
    async where(col, field, value) {
      return [...(await load(col)).values()].filter(d => d[field] === value).map(clone) as never
    },
    set: (col, id, data) => exclusive(async () => {
      (await load(col)).set(id, clone(data) as Record<string, unknown>)
      await persist(col)
    }),
    update: (col, id, patch) => exclusive(async () => {
      const docs = await load(col)
      const doc = docs.get(id)
      if (!doc) throw new Error(`No document ${col}/${id}`)
      docs.set(id, { ...doc, ...clone(patch) })
      await persist(col)
    }),
    delete: (col, id) => exclusive(async () => {
      (await load(col)).delete(id)
      await persist(col)
    }),
    setMany: (col, list) => exclusive(async () => {
      const docs = await load(col)
      for (const { id, data } of list) docs.set(id, { ...docs.get(id), ...clone(data) })
      await persist(col)
    }),
  }
}
