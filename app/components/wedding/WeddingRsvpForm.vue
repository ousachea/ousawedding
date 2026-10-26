<script setup lang="ts">
import { FetchError } from 'ofetch'

const props = defineProps<{
  data: PublicWedding
  token?: string
  invite: ResolvedInvitation | null
  inviteState: 'none' | 'loading' | 'valid' | 'invalid'
}>()
const emit = defineEmits<{ saved: [rsvp: NonNullable<ResolvedInvitation['rsvp']>] }>()
const { t } = useI18n()
const locale = useLocaleCode()
const w = computed(() => props.data.wedding)

const max = computed(() => props.invite?.maxAttendees ?? w.value.rsvp.generalMaxAttendees)
const isGeneral = computed(() => props.inviteState === 'none')
const canRespond = computed(() => {
  if (props.data.deadlinePassed) return false
  if (props.inviteState === 'valid') return props.invite!.canEdit
  return isGeneral.value && w.value.rsvp.allowGeneral
})

const form = reactive({
  name: '',
  attending: null as boolean | null,
  count: 1,
  attendeeNames: [] as string[],
  dietary: '',
  message: '',
})
const editing = ref(false)
const sending = ref(false)
const done = ref<null | boolean>(null)
const serverError = ref('')
const errors = reactive<Record<string, string>>({})
const shaking = reactive<Record<string, boolean>>({})
// Same ID on retries, so a resubmitted open-form RSVP updates instead of duplicating
const submissionId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now())

watch(() => props.invite, (inv) => {
  if (!inv?.rsvp) return
  Object.assign(form, {
    attending: inv.rsvp.attending,
    count: Math.max(1, inv.rsvp.count),
    attendeeNames: [...inv.rsvp.attendeeNames],
    dietary: inv.rsvp.dietary,
    message: inv.rsvp.message,
  })
}, { immediate: true })

const showForm = computed(() => canRespond.value && (!props.invite?.rsvp || editing.value) && done.value === null)

function validate() {
  for (const k of Object.keys(errors)) delete errors[k]
  if (isGeneral.value && !form.name.trim()) errors.name = t('rsvp.errors.name')
  if (form.attending === null) errors.attending = t('rsvp.errors.attending')
  if (form.attending && (!Number.isInteger(form.count) || form.count < 1 || form.count > max.value)) {
    errors.count = t('rsvp.errors.count', { max: max.value })
  }
  for (const key of Object.keys(errors)) shaking[key] = true
  const first = Object.keys(errors)[0]
  const el = first && document.getElementById(`rsvp-${first}`)
  if (el) {
    // Centre the field so the sticky navigation bar can't cover it
    el.focus({ preventScroll: true })
    el.closest('.field')?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }
  return !first
}

async function submit() {
  serverError.value = ''
  if (!validate() || sending.value) return
  sending.value = true
  const body = {
    slug: w.value.slug,
    token: props.token,
    submissionId: isGeneral.value ? submissionId : undefined,
    name: isGeneral.value ? form.name.trim() : undefined,
    attending: form.attending!,
    count: form.attending ? form.count : 0,
    attendeeNames: form.attending ? form.attendeeNames.slice(0, form.count).map(n => n.trim()) : [],
    dietary: form.dietary.trim(),
    message: form.message.trim(),
  }
  try {
    await $fetch('/api/public/rsvp', { method: 'POST', body })
    done.value = form.attending!
    editing.value = false
    emit('saved', { attending: body.attending, count: body.count, attendeeNames: body.attendeeNames, dietary: body.dietary, message: body.message, updatedAt: new Date().toISOString() })
  } catch (e) {
    const err = e as FetchError
    const code = err.data?.data?.code
    serverError.value = err.statusCode === 429 ? t('rsvp.errors.rate')
      : code === 'deadline' ? t('rsvp.errors.deadline')
        : code === 'limit' ? t('rsvp.errors.limit', { max: err.data.data.max })
          : code === 'locked' ? t('rsvp.locked')
            : err.statusCode === 404 ? t('rsvp.invalidLink')
              : t('rsvp.errors.failed')
  } finally {
    sending.value = false
  }
}

// Clear a field's error as soon as the guest fixes it
watch(() => form.name, () => delete errors.name)
watch(() => form.attending, () => {
  delete errors.attending
  delete errors.count
})

watch(() => form.count, (n) => {
  delete errors.count
  if (form.attendeeNames.length > n) form.attendeeNames.length = Math.max(0, n)
})
</script>

<template>
  <section id="rsvp" class="rsvp" aria-labelledby="rsvp-title">
    <div class="container narrow">
      <h2 id="rsvp-title" class="section-title">{{ t('rsvp.title') }}</h2>
      <WeddingOrnament :motif="w.theme.motif" />
      <p class="deadline">
        {{ data.deadlinePassed ? t('rsvp.closed', { date: data.display[locale].deadline }) : t('rsvp.deadline', { date: data.display[locale].deadline }) }}
      </p>

      <div class="panel" aria-live="polite">
        <p v-if="inviteState === 'loading'" class="muted center">{{ t('common.loading') }}</p>

        <p v-else-if="inviteState === 'invalid'" class="notice">{{ t('rsvp.invalidLink') }}</p>

        <p v-else-if="isGeneral && data.deadlinePassed" class="notice">{{ t('rsvp.closed', { date: data.display[locale].deadline }) }}</p>

        <p v-else-if="isGeneral && !w.rsvp.allowGeneral" class="notice">{{ t('rsvp.needInvite') }}</p>

        <template v-else>
          <template v-if="invite">
            <p class="greeting">{{ t('rsvp.greeting', { name: invite.guestName }) }}</p>
            <p class="muted center">{{ t('rsvp.allowed', { n: invite.maxAttendees }, invite.maxAttendees) }}</p>
          </template>

          <div v-if="done !== null" class="success" role="status">
            <WeddingOrnament :motif="w.theme.motif" kind="flower" />
            <p>{{ done ? t('rsvp.thanksYes') : t('rsvp.thanksNo') }}</p>
            <button v-if="invite && w.rsvp.allowUpdates && !data.deadlinePassed" type="button" class="btn btn-outline btn-sm" @click="done = null; editing = true">
              {{ t('rsvp.change') }}
            </button>
          </div>

          <div v-else-if="invite?.rsvp && !editing" class="summary">
            <p>
              {{ t('rsvp.current', { status: invite.rsvp.attending ? t('rsvp.statusYes', { n: invite.rsvp.count }) : t('rsvp.statusNo') }) }}
            </p>
            <button v-if="invite.canEdit" type="button" class="btn btn-outline btn-sm" @click="editing = true">{{ t('rsvp.change') }}</button>
            <p v-else-if="!data.deadlinePassed" class="muted">{{ t('rsvp.locked') }}</p>
          </div>

          <form v-if="showForm" novalidate class="form" @submit.prevent="submit">
            <div v-if="isGeneral" class="field" :class="{ invalid: errors.name, shake: shaking.name }" @animationend="shaking.name = false">
              <label for="rsvp-name">{{ t('rsvp.name') }} <span aria-hidden="true">*</span></label>
              <input id="rsvp-name" v-model="form.name" type="text" autocomplete="name" required :aria-invalid="!!errors.name" aria-describedby="rsvp-name-error" maxlength="120">
              <p v-if="errors.name" id="rsvp-name-error" class="field-error">{{ errors.name }}</p>
            </div>

            <fieldset class="field" :class="{ invalid: errors.attending, shake: shaking.attending }" aria-describedby="rsvp-attending-error" @animationend="shaking.attending = false">
              <legend class="label">{{ t('rsvp.attending') }} <span aria-hidden="true">*</span></legend>
              <div id="rsvp-attending" class="choice-group" tabindex="-1">
                <label class="choice" :class="{ selected: form.attending === true }">
                  <input v-model="form.attending" type="radio" name="attending" :value="true">
                  <span>{{ t('rsvp.accept') }}</span>
                </label>
                <label class="choice" :class="{ selected: form.attending === false }">
                  <input v-model="form.attending" type="radio" name="attending" :value="false">
                  <span>{{ t('rsvp.decline') }}</span>
                </label>
              </div>
              <p v-if="errors.attending" id="rsvp-attending-error" class="field-error">{{ errors.attending }}</p>
            </fieldset>

            <template v-if="form.attending">
              <div class="field" :class="{ invalid: errors.count, shake: shaking.count }" @animationend="shaking.count = false">
                <label for="rsvp-count">{{ t('rsvp.count') }}</label>
                <select v-if="max <= 12" id="rsvp-count" v-model.number="form.count" :aria-invalid="!!errors.count" aria-describedby="rsvp-count-error">
                  <option v-for="n in max" :key="n" :value="n">{{ n }}</option>
                </select>
                <input v-else id="rsvp-count" v-model.number="form.count" type="number" min="1" :max="max" inputmode="numeric" :aria-invalid="!!errors.count" aria-describedby="rsvp-count-error">
                <p v-if="errors.count" id="rsvp-count-error" class="field-error">{{ errors.count }}</p>
              </div>

              <fieldset v-if="form.count > 1" class="field">
                <legend class="label">{{ t('rsvp.attendeeNames') }}</legend>
                <div class="names">
                  <input
                    v-for="n in form.count"
                    :key="n"
                    v-model="form.attendeeNames[n - 1]"
                    type="text"
                    maxlength="120"
                    :aria-label="t('rsvp.attendeeName', { n })"
                    :placeholder="t('rsvp.attendeeName', { n })"
                    class="input"
                  >
                </div>
              </fieldset>

              <div v-if="w.rsvp.askDietary" class="field">
                <label for="rsvp-dietary">{{ t('rsvp.dietary') }}</label>
                <input id="rsvp-dietary" v-model="form.dietary" type="text" maxlength="500">
              </div>
            </template>

            <div class="field">
              <label for="rsvp-message">{{ t('rsvp.message') }}</label>
              <textarea id="rsvp-message" v-model="form.message" rows="3" maxlength="1000" />
            </div>

            <p v-if="serverError" class="server-error" role="alert">{{ serverError }}</p>

            <button type="submit" class="btn btn-primary submit" :disabled="sending" :aria-busy="sending">
              {{ sending ? t('rsvp.sending') : invite?.rsvp ? t('rsvp.update') : t('rsvp.submit') }}
            </button>
          </form>
        </template>
      </div>
    </div>
  </section>
</template>

<style scoped>
.rsvp { padding-block: var(--space-8); }
.narrow { max-width: 36rem; }
.section-title { text-align: center; font-size: clamp(1.9rem, 6vw, 2.6rem); margin-bottom: var(--space-3); }
.deadline { text-align: center; color: var(--c-muted); margin-top: var(--space-3); }
.panel {
  margin-top: var(--space-6);
  padding: var(--space-6) var(--space-5);
  background: var(--c-surface);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.center { text-align: center; }
.muted { color: var(--c-muted); }
.greeting { text-align: center; font-family: var(--font-serif); font-size: 1.5rem; color: var(--c-secondary); }
.notice { text-align: center; }
.form { display: flex; flex-direction: column; gap: var(--space-5); margin-top: var(--space-5); }
fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
legend { padding: 0; margin-bottom: var(--space-1); }
.choice-group { display: grid; gap: var(--space-2); border-radius: var(--radius); }
@media (min-width: 480px) { .choice-group { grid-template-columns: 1fr 1fr; } }
.choice {
  display: flex; align-items: center; gap: var(--space-2);
  min-height: 52px; padding: var(--space-3) var(--space-4);
  border: 1px solid var(--c-line); border-radius: var(--radius); background: var(--c-bg);
  cursor: pointer; transition: border-color 0.15s, background-color 0.15s;
}
.choice input { accent-color: var(--c-secondary); width: 1.1rem; height: 1.1rem; margin: 0; }
.choice.selected { border-color: var(--c-secondary); background: color-mix(in srgb, var(--c-secondary) 6%, var(--c-bg)); }
.choice:has(input:focus-visible) { outline: 2px solid var(--c-secondary); outline-offset: 2px; }
.names { display: grid; gap: var(--space-2); }
.server-error { color: var(--c-danger); text-align: center; }
.submit { align-self: center; min-width: 12rem; }
.success, .summary { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); text-align: center; margin-top: var(--space-4); }
.success p { font-family: var(--font-serif); font-size: 1.35rem; }
</style>
