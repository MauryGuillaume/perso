<template>
  <div class="interrogatoire">
    <div class="section-grid">
      <!-- Left column -->
      <div class="section-col">
        <div class="card">
          <h3 class="section-title">Consultation</h3>
          <div class="fields-stack">
            <div class="form-group">
              <label class="form-label">Motif de consultation</label>
              <textarea
                :value="bilan.motifConsultation"
                @input="emit('update', { motifConsultation: $event.target.value })"
                class="form-textarea"
                placeholder="Douleur plantaire droite, hallux valgus…"
                rows="3"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Antécédents médicaux</label>
              <textarea
                :value="bilan.antecedentsMedicaux"
                @input="emit('update', { antecedentsMedicaux: $event.target.value })"
                class="form-textarea"
                placeholder="Diabète type 2, HTA…"
                rows="3"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Antécédents familiaux</label>
              <textarea
                :value="bilan.antecedentsFamiliaux"
                @input="emit('update', { antecedentsFamiliaux: $event.target.value })"
                class="form-textarea"
                placeholder="Hallux valgus maternel…"
                rows="2"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Maladies</label>
              <textarea
                :value="bilan.maladies"
                @input="emit('update', { maladies: $event.target.value })"
                class="form-textarea"
                placeholder="Maladies actuelles…"
                rows="2"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Traitements en cours</label>
              <textarea
                :value="bilan.traitementsEnCours"
                @input="emit('update', { traitementsEnCours: $event.target.value })"
                class="form-textarea"
                placeholder="Metformine 500mg, Amlodipine…"
                rows="2"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Right column -->
      <div class="section-col">
        <div class="card">
          <h3 class="section-title">Douleur</h3>
          <div class="fields-stack">
            <div class="form-group">
              <label class="form-label">Circonstances d'apparition</label>
              <textarea
                :value="bilan.circumstancesApparition"
                @input="emit('update', { circumstancesApparition: $event.target.value })"
                class="form-textarea"
                placeholder="À la marche, au repos, le matin…"
                rows="3"
              />
            </div>

            <!-- EVA slider -->
            <div class="form-group">
              <label class="form-label">Évaluation de la douleur (EVA)</label>
              <div class="eva-wrapper">
                <div class="eva-labels">
                  <span>Aucune</span>
                  <span>Modérée</span>
                  <span>Maximale</span>
                </div>
                <div class="eva-track">
                  <input
                    type="range"
                    :value="bilan.douleurScore"
                    @input="emit('update', { douleurScore: Number($event.target.value) })"
                    min="0" max="10" step="1"
                    class="eva-slider"
                  />
                  <div class="eva-ticks">
                    <span v-for="n in 11" :key="n" class="tick" :class="{ active: n - 1 <= bilan.douleurScore }">{{ n - 1 }}</span>
                  </div>
                </div>
                <div class="eva-score" :class="evaClass(bilan.douleurScore)">
                  <span class="eva-number">{{ bilan.douleurScore }}</span>
                  <span class="eva-label">{{ evaLabel(bilan.douleurScore) }}</span>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Facteurs aggravants</label>
              <textarea
                :value="bilan.facteursAggravants"
                @input="emit('update', { facteursAggravants: $event.target.value })"
                class="form-textarea"
                placeholder="Marche prolongée, port de talons…"
                rows="2"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Facteurs atténuants</label>
              <textarea
                :value="bilan.facteursAttenuants"
                @input="emit('update', { facteursAttenuants: $event.target.value })"
                class="form-textarea"
                placeholder="Repos, semelles, anti-inflammatoires…"
                rows="2"
              />
            </div>
          </div>
        </div>

        <!-- Questions personnalisées -->
        <div class="card" style="margin-top: var(--space-lg);">
          <div class="card-header">
            <h3 class="section-title">Questions personnalisées</h3>
            <button class="btn btn-secondary btn-sm" @click="showAddQuestion = true">
              + Ajouter
            </button>
          </div>

          <div v-if="bilan.questionsPersonnalisees?.length" class="custom-questions">
            <div
              v-for="q in bilan.questionsPersonnalisees"
              :key="q.id"
              class="custom-question"
            >
              <div class="cq-question">{{ q.question }}</div>
              <textarea
                :value="q.reponse"
                @input="bilanStore.updateQuestionReponse(bilan.id, q.id, $event.target.value)"
                class="form-textarea"
                placeholder="Réponse…"
                rows="2"
              />
              <button class="btn btn-ghost btn-icon btn-sm cq-delete" @click="bilanStore.removeQuestionPersonnalisee(bilan.id, q.id)">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
          <div v-else class="empty-custom">
            <p>Ajoutez des questions spécifiques à cette consultation.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Add question modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showAddQuestion" class="modal-overlay" @click.self="showAddQuestion = false">
          <div class="modal">
            <h3>Nouvelle question</h3>
            <div class="form-group" style="margin-top: 16px;">
              <label class="form-label">Question</label>
              <input
                v-model="newQuestion"
                type="text"
                class="form-input"
                placeholder="Ex: Avez-vous des douleurs nocturnes ?"
                @keydown.enter="addQuestion"
                ref="questionInput"
                autofocus
              />
            </div>
            <div class="modal-actions">
              <button class="btn btn-ghost" @click="showAddQuestion = false">Annuler</button>
              <button class="btn btn-primary" @click="addQuestion" :disabled="!newQuestion.trim()">Ajouter</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useBilanStore } from '@/store/bilans.js'

const props = defineProps({ bilan: Object })
const emit = defineEmits(['update'])
const bilanStore = useBilanStore()

const showAddQuestion = ref(false)
const newQuestion = ref('')
const questionInput = ref(null)

const addQuestion = () => {
  if (!newQuestion.value.trim()) return
  bilanStore.addQuestionPersonnalisee(props.bilan.id, newQuestion.value.trim())
  newQuestion.value = ''
  showAddQuestion.value = false
}

const evaLabel = (score) => {
  if (score === 0) return 'Aucune douleur'
  if (score <= 3) return 'Douleur légère'
  if (score <= 6) return 'Douleur modérée'
  if (score <= 8) return 'Douleur sévère'
  return 'Douleur intense'
}
const evaClass = (score) => {
  if (score === 0) return 'eva-none'
  if (score <= 3) return 'eva-light'
  if (score <= 6) return 'eva-moderate'
  if (score <= 8) return 'eva-severe'
  return 'eva-intense'
}
</script>

<style scoped>
.interrogatoire { }
.section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-lg); }
.section-col { display: flex; flex-direction: column; }
.section-title { font-size: var(--text-md); font-weight: 700; margin-bottom: var(--space-md); color: var(--color-primary); }
.fields-stack { display: flex; flex-direction: column; gap: var(--space-md); }

/* EVA */
.eva-wrapper { background: var(--color-surface-alt); border-radius: var(--radius-md); padding: var(--space-md); }
.eva-labels { display: flex; justify-content: space-between; font-size: var(--text-xs); color: var(--color-text-muted); margin-bottom: 8px; }
.eva-track { position: relative; }
.eva-slider {
  width: 100%; height: 6px; appearance: none; background: var(--color-border);
  border-radius: 3px; outline: none; cursor: pointer;
}
.eva-slider::-webkit-slider-thumb {
  appearance: none; width: 22px; height: 22px; border-radius: 50%;
  background: var(--color-primary); cursor: pointer; box-shadow: 0 2px 6px rgba(26,127,90,.4);
  transition: transform var(--transition-fast);
}
.eva-slider::-webkit-slider-thumb:active { transform: scale(1.2); }
.eva-ticks { display: flex; justify-content: space-between; margin-top: 6px; }
.tick { font-size: 10px; color: var(--color-text-light); width: 18px; text-align: center; }
.tick.active { color: var(--color-primary); font-weight: 600; }
.eva-score {
  display: flex; align-items: center; gap: var(--space-md);
  margin-top: var(--space-md); padding: var(--space-sm) var(--space-md);
  border-radius: var(--radius-md); background: var(--color-surface);
  border: 1px solid var(--color-border);
}
.eva-number { font-size: var(--text-2xl); font-weight: 800; }
.eva-label { font-size: var(--text-sm); font-weight: 500; }
.eva-none { color: var(--color-success); }
.eva-light { color: #84cc16; }
.eva-moderate { color: var(--color-warning); }
.eva-severe { color: #f97316; }
.eva-intense { color: var(--color-error); }

/* Custom questions */
.custom-questions { display: flex; flex-direction: column; gap: var(--space-md); }
.custom-question { position: relative; background: var(--color-surface-alt); border-radius: var(--radius-md); padding: var(--space-md); border: 1px solid var(--color-border); }
.cq-question { font-size: var(--text-sm); font-weight: 600; margin-bottom: 8px; color: var(--color-primary); }
.cq-delete { position: absolute; top: 8px; right: 8px; }
.empty-custom { text-align: center; padding: var(--space-lg); color: var(--color-text-muted); font-size: var(--text-sm); }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 9990; display: flex; align-items: center; justify-content: center; padding: var(--space-md); }
.modal { background: var(--color-surface); border-radius: var(--radius-xl); padding: var(--space-xl); max-width: 420px; width: 100%; box-shadow: var(--shadow-xl); }
.modal h3 { font-size: var(--text-lg); font-weight: 700; }
.modal-actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-xl); }
.fade-enter-active, .fade-leave-active { transition: opacity 200ms; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .section-grid { grid-template-columns: 1fr; }
}
</style>
