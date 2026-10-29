<template>
  <div class="annotation-canvas">
    <div class="canvas-layout">
      <!-- Toolbar -->
      <div class="card canvas-toolbar">
        <h3 class="section-title">Annotations libres</h3>
        <p class="section-desc">Dessinez ou écrivez au stylet sur cette zone.</p>

        <div class="tool-group">
          <div class="tool-label">Outil</div>
          <div class="tool-btns">
            <button class="tool-btn" :class="{ active: tool === 'pen' }" @click="setTool('pen')" title="Stylo">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
            <button class="tool-btn" :class="{ active: tool === 'eraser' }" @click="setTool('eraser')" title="Gomme">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/><line x1="6" y1="11" x2="16" y2="21"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="tool-group">
          <div class="tool-label">Couleur</div>
          <div class="color-btns">
            <button
              v-for="c in colors"
              :key="c.value"
              class="color-btn"
              :class="{ active: color === c.value }"
              :style="{ background: c.value }"
              :title="c.name"
              @click="color = c.value"
            />
          </div>
        </div>

        <div class="tool-group">
          <div class="tool-label">Épaisseur</div>
          <input type="range" v-model.number="lineWidth" min="1" max="20" class="size-slider" />
          <span class="size-preview" :style="{ width: lineWidth + 'px', height: lineWidth + 'px' }" />
        </div>

        <div class="tool-actions">
          <button class="btn btn-ghost btn-sm w-full" @click="undo" :disabled="!canUndo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 00-4-4H4"/>
            </svg>
            Annuler
          </button>
          <button class="btn btn-ghost btn-sm w-full" @click="clearCanvas">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
            Tout effacer
          </button>
          <button class="btn btn-secondary btn-sm w-full" @click="saveCanvas">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/>
            </svg>
            Sauvegarder
          </button>
        </div>
      </div>

      <!-- Canvas -->
      <div class="card canvas-wrapper">
        <canvas
          ref="canvasRef"
          class="draw-canvas"
          :style="{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }"
          @mousedown="startDraw"
          @mousemove="draw"
          @mouseup="endDraw"
          @mouseleave="endDraw"
          @touchstart.prevent="startDrawTouch"
          @touchmove.prevent="drawTouch"
          @touchend.prevent="endDraw"
        />
        <div v-if="isEmpty" class="canvas-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="canvas-icon">
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <p>Commencez à dessiner ici</p>
          <p class="canvas-sub">Supporte le stylet / tactile</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

const props = defineProps({ bilan: Object })
const emit = defineEmits(['update'])

const canvasRef = ref(null)
const tool = ref('pen')
const color = ref('#2B6CB0')
const lineWidth = ref(3)
const isDrawing = ref(false)
const isEmpty = ref(true)
const history = ref([])
const canUndo = ref(false)

const colors = [
  { value: '#2B6CB0', name: 'Bleu PodoFlow' },
  { value: '#52B848', name: 'Vert PodoFlow' },
  { value: '#1c2b27', name: 'Noir' },
  { value: '#ef4444', name: 'Rouge' },
  { value: '#3b82f6', name: 'Bleu' },
  { value: '#f59e0b', name: 'Orange' },
  { value: '#a855f7', name: 'Violet' },
  { value: '#ec4899', name: 'Rose' },
]

let ctx = null

onMounted(async () => {
  await nextTick()
  initCanvas()
  window.addEventListener('resize', initCanvas)
})

onUnmounted(() => {
  window.removeEventListener('resize', initCanvas)
})

const initCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const parent = canvas.parentElement
  canvas.width = parent.clientWidth - 32
  canvas.height = 500
  ctx = canvas.getContext('2d')
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  // Restore saved drawing
  if (props.bilan.canvasData) {
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0)
    img.src = props.bilan.canvasData
    isEmpty.value = false
  }
}

const getPos = (e) => {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  }
}

const getTouchPos = (e) => {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  const touch = e.touches[0]
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (touch.clientX - rect.left) * scaleX,
    y: (touch.clientY - rect.top) * scaleY
  }
}

const saveState = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  history.value.push(canvas.toDataURL())
  if (history.value.length > 20) history.value.shift()
  canUndo.value = history.value.length > 0
}

const startDraw = (e) => {
  saveState()
  isDrawing.value = true
  const { x, y } = getPos(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
  setupCtx()
}

const draw = (e) => {
  if (!isDrawing.value) return
  const { x, y } = getPos(e)
  ctx.lineTo(x, y)
  ctx.stroke()
  isEmpty.value = false
}

const startDrawTouch = (e) => {
  saveState()
  isDrawing.value = true
  const { x, y } = getTouchPos(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
  setupCtx()
}

const drawTouch = (e) => {
  if (!isDrawing.value) return
  const { x, y } = getTouchPos(e)
  ctx.lineTo(x, y)
  ctx.stroke()
  isEmpty.value = false
}

const endDraw = () => { isDrawing.value = false }

const setupCtx = () => {
  if (!ctx) return
  if (tool.value === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = 'rgba(0,0,0,1)'
    ctx.lineWidth = lineWidth.value * 3
  } else {
    ctx.globalCompositeOperation = 'source-over'
    ctx.strokeStyle = color.value
    ctx.lineWidth = lineWidth.value
  }
}

const setTool = (t) => { tool.value = t }

const undo = () => {
  if (!history.value.length) return
  const canvas = canvasRef.value
  const prev = history.value.pop()
  canUndo.value = history.value.length > 0
  if (prev) {
    const img = new Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
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

const saveCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  emit('update', { canvasData: canvas.toDataURL('image/png') })
}
</script>

<style scoped>
.annotation-canvas {}
.canvas-layout { display: grid; grid-template-columns: 220px 1fr; gap: var(--space-lg); align-items: start; }
.section-title { font-size: var(--text-md); font-weight: 700; margin-bottom: var(--space-sm); color: var(--color-primary); }
.section-desc { font-size: var(--text-xs); color: var(--color-text-muted); margin-bottom: var(--space-lg); line-height: 1.5; }

.tool-group { margin-bottom: var(--space-md); }
.tool-label { font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: var(--color-text-muted); margin-bottom: 8px; }
.tool-btns { display: flex; gap: 6px; }
.tool-btn {
  padding: 8px; border-radius: var(--radius-md); border: 2px solid var(--color-border);
  background: var(--color-surface-alt); color: var(--color-text-muted);
  cursor: pointer; transition: all var(--transition-fast);
  display: flex; align-items: center; justify-content: center;
}
.tool-btn.active { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary); }
.tool-btn:hover:not(.active) { border-color: var(--color-text-muted); }

.color-btns { display: flex; gap: 6px; flex-wrap: wrap; }
.color-btn {
  width: 26px; height: 26px; border-radius: 50%;
  border: 3px solid transparent; cursor: pointer; transition: all var(--transition-fast);
}
.color-btn.active { border-color: var(--color-text); transform: scale(1.2); }
.color-btn:hover { transform: scale(1.15); }

.size-slider { width: 100%; margin-bottom: 8px; }
.size-preview {
  display: block; border-radius: 50%; background: var(--color-primary);
  max-width: 24px; max-height: 24px; min-width: 4px; min-height: 4px;
}

.tool-actions { display: flex; flex-direction: column; gap: 6px; margin-top: var(--space-lg); }

.canvas-wrapper { position: relative; padding: var(--space-md); overflow: hidden; }
.draw-canvas {
  display: block; border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border); background: white;
  touch-action: none; max-width: 100%;
}
.canvas-placeholder {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; pointer-events: none;
  color: var(--color-text-light);
}
.canvas-icon { margin-bottom: var(--space-md); opacity: .4; }
.canvas-placeholder p { font-size: var(--text-sm); font-weight: 500; }
.canvas-sub { font-size: var(--text-xs); }

@media (max-width: 768px) {
  .canvas-layout { grid-template-columns: 1fr; }
}
</style>
