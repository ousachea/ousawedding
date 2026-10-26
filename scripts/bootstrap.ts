// One-time Firebase setup: makes an existing Firebase Auth user an all-access owner and,
// with --seed, creates the sample wedding.
//
//   node --env-file=.env scripts/bootstrap.ts --email you@example.com [--seed] [--slug our-wedding]
//
// Reads the same NUXT_FIREBASE_* variables as the app.
import { parseArgs } from 'node:util'
import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { sampleWedding } from '../server/utils/sample.ts'

const { values } = parseArgs({ options: { email: { type: 'string' }, seed: { type: 'boolean' }, slug: { type: 'string', default: 'our-wedding' } } })
if (!values.email) throw new Error('Pass --email of a user created in Firebase Console → Authentication')

const env = process.env
initializeApp({
  credential: cert({
    projectId: env.NUXT_FIREBASE_PROJECT_ID ?? 'ousa-wedding',
    clientEmail: env.NUXT_FIREBASE_CLIENT_EMAIL,
    privateKey: env.NUXT_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
})
const db = getFirestore()
db.settings({ ignoreUndefinedProperties: true })

const user = await getAuth().getUserByEmail(values.email)
await db.collection('admins').doc(user.uid).set({ id: user.uid, email: values.email, name: user.displayName ?? '', role: 'owner', weddingIds: ['*'] })
console.log(`✓ ${values.email} is now an owner with access to all weddings`)

if (values.seed) {
  const existing = await db.collection('weddings').where('slug', '==', values.slug).get()
  if (!existing.empty) {
    console.log(`• A wedding at /${values.slug} already exists, skipping seed`)
  } else {
    const { wedding, events, gallery, guests } = sampleWedding(values.slug)
    const batch = db.batch()
    batch.set(db.collection('weddings').doc(wedding.id), wedding)
    for (const e of events) batch.set(db.collection('events').doc(e.id), e)
    for (const g of gallery) batch.set(db.collection('gallery').doc(g.id), g)
    for (const g of guests) batch.set(db.collection('guests').doc(g.id), g)
    await batch.commit()
    console.log(`✓ Sample wedding created at /${values.slug}`)
  }
}
