<template>
  <div class="timer" :class="{ active: running }">
    <svg class="ring" viewBox="0 0 100 100">
      <circle class="ring-track" cx="50" cy="50" r="44" />
      <circle
        class="ring-fill"
        cx="50" cy="50" r="44"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="offset"
      />
    </svg>
    <div class="timer-center">
      <span class="timer-value tabular">{{ display }}</span>
      <button class="timer-btn" @click="toggle">{{ running ? 'Pause' : (remaining === totalSec ? 'Démarrer' : 'Reprendre') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue'

const props = defineProps({ seconds: { type: Number, required: true } })
const emit = defineEmits(['done'])

const totalSec = ref(props.seconds)
const remaining = ref(props.seconds)
const running = ref(false)
let intervalId = null

watch(() => props.seconds, (s) => { totalSec.value = s; remaining.value = s; stop() })

const circumference = 2 * Math.PI * 44
const offset = computed(() => circumference * (1 - remaining.value / totalSec.value))
const display = computed(() => {
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

function toggle() {
  if (running.value) { stop(); return }
  if (remaining.value <= 0) { remaining.value = totalSec.value }
  running.value = true
  intervalId = setInterval(() => {
    remaining.value -= 1
    if (remaining.value <= 0) {
      remaining.value = 0
      stop()
      emit('done')
    }
  }, 1000)
}
function stop() {
  running.value = false
  if (intervalId) { clearInterval(intervalId); intervalId = null }
}
onUnmounted(stop)
</script>

<style scoped>
.timer { position: relative; width: 140px; height: 140px; }
.ring { width: 100%; height: 100%; transform: rotate(-90deg); }
.ring-track { fill: none; stroke: var(--color-surface-sunken); stroke-width: 8; }
.ring-fill {
  fill: none; stroke: var(--color-accent); stroke-width: 8; stroke-linecap: butt;
  transition: stroke-dashoffset 1s linear;
}
.timer-center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
}
.timer-value { font-family: var(--font-display); font-weight: 400; font-size: 1.7rem; color: var(--color-ink); }
.timer-btn {
  border: 2px solid var(--color-ink); background: var(--color-surface); color: var(--color-ink);
  padding: 6px 15px; border-radius: var(--radius-sm);
  font-family: var(--font-display); font-weight: 400; letter-spacing: 0.02em; text-transform: uppercase;
  font-size: 0.68rem; cursor: pointer;
  box-shadow: 2px 2px 0 rgba(0,0,0,0.3);
}
.timer.active .timer-btn { background: var(--color-accent); color: #fff; }
</style>
