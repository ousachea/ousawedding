import { promises as fs } from 'node:fs'
import { join } from 'node:path'
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

export type Collection = 'weddings' | 'events' | 'guests' | 'invitations' | 'rsvps' | 'gallery' | 'admins'

export interface Tx {
  get<T>(col: Collection, id: string): Promise<T | null>
  set(col: Collection, id: string, data: object): void
}

/**
 * Minimal document store. Queries are equality-only on a single field; sorting and
 * filtering beyond that happen in memory, which is fine at wedding scale (hundreds of rows).
 */
export interface Db {
  get<T>(col: Collection, id: string): Promise<T | null>
  where<T>(col: Collection, field: string, value: unknown): Promise<T[]>
  set(col: Collection, id: string, data: object): Promise<void>
  update(col: Collection, id: string, patch: object): Promise<void>
  delete(col: Collection, id: string): Promise<void>
  /** Writes many documents at once (used for reorder and bulk actions). */
  setMany(col: Collection, docs: Array<{ id: string, data: object }>): Promise<void>
  transaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R>
}

let db: Db | undefined

export function useDb(): Db {
  db ??= useDriver() === 'local' ? createLocalDb() : createFirestoreDb()
  return db
}

export function useDriver(): 'firebase' | 'local' {
  const driver = useRuntimeConfig().driver
  if (driver === 'local' && !import.meta.dev && process.env.ALLOW_LOCAL_DRIVER !== 'true') {
    // Serverless file systems are ephemeral: refuse rather than silently lose RSVPs
    throw new Error('The local data driver is for development only. Set NUXT_DRIVER=firebase.')
  }
  return driver === 'local' ? 'local' : 'firebase'
}

// --- Firebase ---------------------------------------------------------------

let firebaseApp: App | undefined

export function useFirebaseApp(): App {
  if (firebaseApp) return firebaseApp
  const { firebase } = useRuntimeConfig()
  if (!firebase.clientEmail || !firebase.privateKey) {
    throw new Error('Missing NUXT_FIREBASE_CLIENT_EMAIL / NUXT_FIREBASE_PRIVATE_KEY (service account). See README.')
  }
  firebaseApp = getApps()[0] ?? initializeApp({
    credential: cert({
      projectId: firebase.projectId,
      clientEmail: firebase.clientEmail,
      // Env vars usually carry the key with literal "\n" sequences
      privateKey: firebase.privateKey.replace(/\\n/g, '\n'),
    }),
    storageBucket: firebase.storageBucket,
  })
  return firebaseApp
}

function createFirestoreDb(): Db {
  let fs: Firestore | undefined
  const store = () => {
    if (!fs) {
      fs = getFirestore(useFirebaseApp())
      fs.settings({ ignoreUndefinedProperties: true })
    }
    return fs
  }
  return {
    async get(col, id) {
      const snap = await store().collection(col).doc(id).get()
      return snap.exists ? (snap.data() as never) : null
    },
    async where(col, field, value) {
      const snap = await store().collection(col).where(field, '==', value).get()
      return snap.docs.map(d => d.data() as never)
    },
    async set(col, id, data) {
      await store().collection(col).doc(id).set(data)
    },
    async update(col, id, patch) {
      await store().collection(col).doc(id).update(patch)
    },
    async delete(col, id) {
      await store().collection(col).doc(id).delete()
    },
    async setMany(col, docs) {
      // Firestore batches hold up to 500 writes
      for (let i = 0; i < docs.length; i += 500) {
        const batch = store().batch()
        for (const { id, data } of docs.slice(i, i + 500)) batch.set(store().collection(col).doc(id), data, { merge: true })
        await batch.commit()
      }
    },
    transaction(fn) {
      return store().runTransaction(t => fn({
        async get(col, id) {
          const snap = await t.get(store().collection(col).doc(id))
          return snap.exists ? (snap.data() as never) : null
        },
        set(col, id, data) {
          t.set(store().collection(col).doc(id), data)
        },
      }))
    },
  }
}

// --- Local (development and tests) -----------------------------------------

function createLocalDb(): Db {
  const dir = useRuntimeConfig().localDataDir
  const cache = new Map<Collection, Map<string, Record<string, unknown>>>()
  let queue: Promise<unknown> = Promise.resolve()

  // Serialises every write and transaction so concurrent requests behave like Firestore transactions
  const exclusive = <R>(fn: () => Promise<R>): Promise<R> => {
    const run = queue.then(fn, fn)
    queue = run.catch(() => {})
    return run
  }

  async function load(col: Collection) {
    let docs = cache.get(col)
    if (!docs) {
      try {
        docs = new Map(Object.entries(JSON.parse(await fs.readFile(join(dir, `${col}.json`), 'utf8'))))
      } catch {
        docs = new Map()
      }
      cache.set(col, docs)
    }
    return docs
  }

  async function persist(col: Collection) {
    await fs.mkdir(dir, { recursive: true })
    const file = join(dir, `${col}.json`)
    await fs.writeFile(`${file}.tmp`, JSON.stringify(Object.fromEntries(await load(col)), null, 2))
    await fs.rename(`${file}.tmp`, file)
  }

  const clone = <T>(v: T): T => structuredClone(v)

  return {
    async get(col, id) {
      const doc = (await load(col)).get(id)
      return doc ? clone(doc) as never : null
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
    transaction: fn => exclusive(async () => {
      const writes: Array<[Collection, string, object]> = []
      const result = await fn({
        async get(col, id) {
          const doc = (await load(col)).get(id)
          return doc ? clone(doc) as never : null
        },
        set(col, id, data) {
          writes.push([col, id, data])
        },
      })
      for (const [col, id, data] of writes) (await load(col)).set(id, clone(data) as Record<string, unknown>)
      for (const col of new Set(writes.map(w => w[0]))) await persist(col)
      return result
    }),
  }
}
