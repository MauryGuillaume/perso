<template>
  <!-- Bouton flottant -->
  <div class="floating-wrap">
    <Transition name="pop">
      <button
        v-if="!open"
        class="fab-btn"
        @click="open = true"
        title="Annotations libres"
        :class="{ 'fab-btn--has-data': hasData }"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20h9"/>
          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        <span v-if="hasData" class="fab-dot" />
      </button>
    </Transition>

    <!-- Drawer d'annotation -->
    <Teleport to="body">
      <Transition name="drawer">
        <div v-if="open" class="annotation-drawer">
          <div class="drawer-backdrop" @click="close" />
          <div class="drawer-panel">
            <!-- Header -->
            <div class="drawer-header">
              <div class="drawer-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                Annotations libres
              </div>
              <div class="drawer-actions">
                <button class="btn btn-ghost btn-sm btn-icon" @click="undo" :disabled="!canUndo" title="Annuler">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/>
                  </svg>
                </button>
                <button class="btn btn-ghost btn-sm btn-icon" @click="clearCanvas" title="Effacer tout">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  </svg>
                </button>
                <button class="btn btn-secondary btn-sm" @click="saveAndClose">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/>
                  </svg>
                  Sauvegarder
                </button>
                <button class="btn btn-ghost btn-icon" @click="close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Toolbar -->
            <div class="drawer-toolbar">
              <div class="tool-group">
                <button class="tool-btn" :class="{ active: tool === 'pen' }" @click="tool = 'pen'" title="Stylo">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                </button>
                <button class="tool-btn" :class="{ active: tool === 'text' }" @click="tool = 'text'" title="Texte">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
                  </svg>
                </button>
                <button class="tool-btn" :class="{ active: tool === 'eraser' }" @click="tool = 'eraser'" title="Gomme">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/><line x1="6" y1="11" x2="16" y2="21"/>
                  </svg>
                </button>
              </div>

              <div class="tool-sep" />

              <div class="color-group">
                <button
                  v-for="c in colors"
                  :key="c.v"
                  class="color-dot"
                  :class="{ active: color === c.v }"
                  :style="{ background: c.v }"
                  @click="color = c.v"
                  :title="c.n"
                />
              </div>

              <div class="tool-sep" />

              <div class="size-group">
                <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="2" fill="currentColor"/></svg>
                <input type="range" v-model.number="lineWidth" min="1" max="16" class="size-range" />
                <svg width="14" height="14" viewBox="0 0 14 14"><circle cx="7" cy="7" r="5" fill="currentColor"/></svg>
              </div>
            </div>

            <!-- Canvas zone -->
            <div class="drawer-canvas-wrap" ref="canvasWrap">
              <canvas
                ref="canvasRef"
                class="draw-canvas"
                :style="{ cursor: canvasCursor }"
                @mousedown="startDraw"
                @mousemove="draw"
                @mouseup="endDraw"
                @mouseleave="endDraw"
                @touchstart.prevent="startDrawTouch"
                @touchmove.prevent="drawTouch"
                @touchend.prevent="endDraw"
                @click="onCanvasClick"
              />
              <div v-if="isEmpty" class="canvas-hint">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                <span>Dessinez ici – compatible stylet et tactile</span>
              </div>
            </div>

            <!-- Text input overlay -->
            <div
              v-if="textInput.active"
              class="text-overlay"
              :style="{ left: textInput.x + 'px', top: textInput.y + 'px' }"
            >
              <input
                ref="textInputRef"
                v-model="textInput.value"
                class="text-input-field"
                placeholder="Saisir texte…"
                @keydown.enter="confirmText"
                @keydown.escape="textInput.active = false"
                :style="{ color: color, fontSize: Math.max(14, lineWidth * 3) + 'px' }"
              />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useBilanStore } from '@/store/bilans.js'
import { useUIStore } from '@/store/ui.js'

const props = defineProps({ bilanId: String })
const bilanStore = useBilanStore()
const uiStore = useUIStore()

const open = ref(false)
const canvasRef = ref(null)
const canvasWrap = ref(null)
const textInputRef = ref(null)
let ctx = null

const tool = ref('pen')
const color = ref('#1A2B3C')
const lineWidth = ref(3)
const isDrawing = ref(false)
const isEmpty = ref(true)
const history = ref([])
const canUndo = computed(() => history.value.length > 0)

const colors = [
  { v: '#1A2B3C', n: 'Noir' },
  { v: '#2B6CB0', n: 'Bleu' },
  { v: '#52B848', n: 'Vert' },
  { v: '#ef4444', n: 'Rouge' },
  { v: '#f59e0b', n: 'Orange' },
  { v: '#a855f7', n: 'Violet' },
  { v: '#ffffff', n: 'Blanc (gomme)' },
]

const textInput = ref({ active: false, x: 0, y: 0, value: '' })

const canvasCursor = computed(() => {
  if (tool.value === 'eraser') return 'cell'
  if (tool.value === 'text') return 'text'
  return 'crosshair'
})

const hasData = computed(() => {
  const b = bilanStore.bilans.find(b => b.id === props.bilanId)
  return b?.canvasData != null
})

const initCanvas = async () => {
  await nextTick()
  const canvas = canvasRef.value
  const wrap = canvasWrap.value
  if (!canvas || !wrap) return
  canvas.width = wrap.clientWidth
  canvas.height = wrap.clientHeight || 500
  ctx = canvas.getContext('2d')
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // Restore existing data
  const bilan = bilanStore.bilans.find(b => b.id === props.bilanId)
  if (bilan?.canvasData) {
    const img = new Image()
    img.onload = () => { ctx.drawImage(img, 0, 0); isEmpty.value = false }
    img.src = bilan.canvasData
  }
}

watch(open, async (val) => {
  if (val) {
    await nextTick()
    initCanvas()
  }
})

const saveState = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  history.value.push(canvas.toDataURL())
  if (history.value.length > 25) history.value.shift()
}

const getPos = (e) => {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const sx = canvas.width / rect.width
  const sy = canvas.height / rect.height
  return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }
}

const getTouchPos = (e) => {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const t = e.touches[0]
  const sx = canvas.width / rect.width
  const sy = canvas.height / rect.height
  return { x: (t.clientX - rect.left) * sx, y: (t.clientY - rect.top) * sy }
}

const setupCtx = () => {
  if (tool.value === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.lineWidth = lineWidth.value * 4
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color.value
    ctx.lineWidth = lineWidth.value
  }
}

const startDraw = (e) => {
  if (tool.value === 'text') return
  saveState()
  isDrawing.value = true
  const { x, y } = getPos(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
  setupCtx()
}
const draw = (e) => {
  if (!isDrawing.value || tool.value === 'text') return
  const { x, y } = getPos(e)
  ctx.lineTo(x, y)
  ctx.stroke()
  isEmpty.value = false
}
const startDrawTouch = (e) => {
  if (tool.value === 'text') return
  saveState()
  isDrawing.value = true
  const { x, y } = getTouchPos(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
  setupCtx()
}
const drawTouch = (e) => {
  if (!isDrawing.value || tool.value === 'text') return
  const { x, y } = getTouchPos(e)
  ctx.lineTo(x, y)
  ctx.stroke()
  isEmpty.value = false
}
const endDraw = () => { isDrawing.value = false }

const onCanvasClick = (e) => {
  if (tool.value !== 'text') return
  const { x, y } = getPos(e)
  const rect = canvasRef.value.getBoundingClientRect()
  textInput.value = {
    active: true,
    x: e.clientX - rect.left,
    y: e.clientY - rect.top - 10,
    value: ''
  }
  nextTick(() => textInputRef.value?.focus())
}

const confirmText = () => {
  if (!textInput.value.value.trim()) { textInput.value.active = false; return }
  saveState()
  const { x, y } = getPos({ clientX: textInput.value.x + canvasRef.value.getBoundingClientRect().left, clientY: textInput.value.y + canvasRef.value.getBoundingClientRect().top + 10 })
  ctx.globalCompositeOperation = 'source-over'
  ctx.font = `${Math.max(14, lineWidth.value * 3)}px Inter, sans-serif`
  ctx.fillStyle = color.value
  ctx.fillText(textInput.value.value, x, y)
  isEmpty.value = false
  textInput.value.active = false
}

const undo = () => {
  if (!history.value.length) return
  const canvas = canvasRef.value
  const prev = history.value.pop()
  if (prev) {
    const img = new Image()
    img.onload = () => { ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(img, 0, 0) }
    img.src = prev
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    isEmpty.value = true
  }
}

const clearCanvas = () => {
  saveState()
  ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  isEmpty.value = true
}

const saveAndClose = () => {
  const canvas = canvasRef.value
  if (!canvas) { open.value = false; return }
  bilanStore.updateBilan(props.bilanId, { canvasData: canvas.toDataURL('image/png') })
  uiStore.success('Annotations sauvegardées')
  open.value = false
}

const close = () => {
  // auto-save on close if has content
  if (!isEmpty.value && canvasRef.value) {
    bilanStore.updateBilan(props.bilanId, { canvasData: canvasRef.value.toDataURL('image/png') })
  }
  open.value = false
}
</script>

<style scoped>
.floating-wrap { position: fixed; bottom: 96px; right: var(--space-lg); z-index: 500; }

.fab-btn {
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--color-primary); color: white;
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 20px rgba(43,108,176,.4);
  transition: all var(--transition-fast); position: relative;
}
.fab-btn:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(43,108,176,.5); }
.fab-btn:active { transform: scale(.95); }
.fab-btn--has-data { background: var(--gradient-brand); }
.fab-dot {
  position: absolute; top: 4px; right: 4px;
  width: 10px; height: 10px; border-radius: 50%;
  background: var(--color-accent); border: 2px solid white;
}

/* Drawer */
.annotation-drawer { position: fixed; inset: 0; z-index: 8000; display: flex; }
.drawer-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.35); backdrop-filter: blur(3px); }
.drawer-panel {
  position: relative; z-index: 1;
  width: min(900px, 100vw); height: 100dvh;
  margin-left: auto;
  background: var(--color-surface);
  display: flex; flex-direction: column;
  box-shadow: -8px 0 40px rgba(0,0,0,.15);
}

.drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}
.drawer-title { display: flex; align-items: center; gap: var(--space-sm); font-weight: 700; font-size: var(--text-lg); color: var(--color-primary); }
.drawer-actions { display: flex; align-items: center; gap: var(--space-sm); }

.drawer-toolbar {
  display: flex; align-items: center; gap: var(--space-md);
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-surface-alt);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0; flex-wrap: wrap;
}
.tool-group { display: flex; gap: 4px; }
.tool-btn {
  width: 34px; height: 34px; border-radius: var(--radius-md); border: 1.5px solid var(--color-border);
  background: var(--color-surface); color: var(--color-text-muted);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all var(--transition-fast);
}
.tool-btn.active { background: var(--color-primary-light); border-color: var(--color-primary); color: var(--color-primary); }
.tool-btn:hover:not(.active) { border-color: var(--color-primary); }

.tool-sep { width: 1px; height: 28px; background: var(--color-border); }

.color-group { display: flex; gap: 6px; align-items: center; }
.color-dot {
  width: 24px; height: 24px; border-radius: 50%; border: 2.5px solid transparent; cursor: pointer;
  transition: transform var(--transition-fast); box-shadow: 0 1px 3px rgba(0,0,0,.15);
}
.color-dot.active { border-color: var(--color-text); transform: scale(1.25); }
.color-dot:hover:not(.active) { transform: scale(1.15); }

.size-group { display: flex; align-items: center; gap: 6px; color: var(--color-text-muted); }
.size-range { width: 80px; }

/* Canvas */
.drawer-canvas-wrap {
  flex: 1; position: relative; overflow: hidden;
  background: #fff; margin: var(--space-sm);
  border-radius: var(--radius-md); border: 1px solid var(--color-border);
}
.draw-canvas { display: block; width: 100%; height: 100%; touch-action: none; }
.canvas-hint {
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--space-md); color: var(--color-text-light); pointer-events: none;
  font-size: var(--text-sm);
}

/* Text input overlay */
.text-overlay { position: absolute; }
.text-input-field {
  background: transparent; border: none; outline: none;
  font-family: Inter, sans-serif; font-weight: 500;
  min-width: 100px; caret-color: currentColor;
}

/* Transitions */
.pop-enter-active, .pop-leave-active { transition: all 200ms; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(.7); }

.drawer-enter-active { transition: all 280ms cubic-bezier(.2, .8, .3, 1); }
.drawer-leave-active { transition: all 220ms cubic-bezier(.4, 0, 1, 1); }
.drawer-enter-from .drawer-panel { transform: translateX(100%); }
.drawer-leave-to .drawer-panel { transform: translateX(100%); }
.drawer-enter-from .drawer-backdrop { opacity: 0; }
.drawer-leave-to .drawer-backdrop { opacity: 0; }

@media (max-width: 600px) {
  .floating-wrap { bottom: 80px; right: var(--space-md); }
  .drawer-panel { width: 100vw; }
  .size-range { width: 60px; }
}
</style>
