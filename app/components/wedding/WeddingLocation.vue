<script setup lang="ts">
// The main venue: its name and address, a live Google map, and a Directions button that opens the maps app
const props = defineProps<{ data: PublicWedding }>()
const { t } = useI18n()
const L = useLocalized()
const w = computed(() => props.data.wedding)
const map = computed(() => venueMap(w.value.location))
</script>

<template>
  <section v-if="map" id="location" class="location" aria-labelledby="location-title">
    <div class="container narrow">
      <span v-reveal class="section-icon"><WeddingIcon name="pin" /></span>
      <h2 v-reveal id="location-title" class="section-title">{{ t('location.title') }}</h2>
      <WeddingOrnament v-reveal="100" :motif="w.theme.motif" />
      <div v-reveal="150" class="frame">
        <div class="mat">
          <iframe :src="map.embed" :title="t('location.mapLabel')" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen />
        </div>
        <address v-if="L(w.location!.venue) || L(w.location!.address)" class="place">
          <strong v-if="L(w.location!.venue)">{{ L(w.location!.venue) }}</strong>
          <span v-if="L(w.location!.address)">{{ L(w.location!.address) }}</span>
        </address>
        <a :href="map.directions" target="_blank" rel="noopener" class="btn btn-primary directions">
          <WeddingIcon name="pin" />{{ t('events.directions') }}
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.location { padding-block: var(--space-8); text-align: center; }
.narrow { max-width: 36rem; }
.section-title { font-size: clamp(1.9rem, 6vw, 2.6rem); margin-bottom: var(--space-3); }

/* Classic: a card with a gold double rule, like the printed invitation, the map set in it as a picture */
.frame {
  position: relative; margin-top: var(--space-6); padding: var(--space-3) var(--space-3) var(--space-5);
  background: var(--c-surface); border: 1px solid var(--c-line); border-radius: var(--radius-lg); box-shadow: var(--shadow);
}
.frame::before {
  content: ''; position: absolute; inset: 5px; border: 1px solid var(--c-line-soft); border-radius: calc(var(--radius-lg) - 4px); pointer-events: none;
}
.mat {
  position: relative; aspect-ratio: 4 / 3; overflow: hidden; border-radius: var(--radius);
  box-shadow: inset 0 0 0 1px var(--c-line), 0 1px 2px rgb(0 0 0 / 0.08);
  background: color-mix(in srgb, var(--c-secondary) 8%, var(--c-bg));
}
.mat iframe {
  display: block; width: 100%; height: 100%; border: 0;
  /* Google's own colours, so streets and the red pin read clearly; just a touch warmer, like the paper */
  filter: sepia(0.12) saturate(0.95);
}
.place { font-style: normal; display: flex; flex-direction: column; gap: var(--space-1); margin-top: var(--space-5); padding-inline: var(--space-3); white-space: pre-line; }
.place strong { font-family: var(--font-serif); font-size: 1.3rem; font-weight: 500; color: var(--c-secondary); }
.place span { color: var(--c-muted); font-size: 0.95rem; }
.directions { position: relative; display: inline-flex; align-items: center; gap: var(--space-2); margin-top: var(--space-4); }

/* Floral: no card, the map on the paper edged in the lavender */
.style-floral .frame { background: none; border: 0; box-shadow: none; padding: 0; }
.style-floral .frame::before { display: none; }
/* A plain rounded map in every style: an arch would cut off Google's place card in the top corner */
.style-floral .mat {
  border-radius: var(--radius-lg);
  box-shadow: 0 0 0 6px var(--c-bg), 0 0 0 7px color-mix(in srgb, var(--c-secondary) 45%, transparent), 0 18px 30px -20px rgb(0 0 0 / 0.4);
}
.style-floral .place strong { font-weight: 600; }

/* Ruby: the red embossed arch of the schedule, the map inset like its photos, a white button */
.style-ruby .frame {
  margin-inline: var(--space-3); padding: 5rem var(--space-5) 4rem;
  background: var(--emboss), var(--c-secondary); color: #fff; border: 0;
  border-radius: 12rem 12rem 7rem 7rem; box-shadow: 0 18px 30px -18px rgb(80 0 10 / 0.7);
}
.style-ruby .frame::before { display: none; }
.style-ruby .mat { aspect-ratio: 1; box-shadow: 0 0 0 4px rgb(255 255 255 / 0.85); }
.style-ruby .place { text-transform: uppercase; letter-spacing: 0.04em; }
.style-ruby .place strong { color: #fff; font-family: var(--font-script); font-weight: 400; font-size: 2rem; text-transform: none; letter-spacing: 0; }
.style-ruby .place strong:lang(km) { font-size: 1.4rem; line-height: 1.6; }
.style-ruby .place span { color: #fff; opacity: 0.9; }
.style-ruby .directions { background: #fff; border-color: #fff; color: var(--c-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
</style>
