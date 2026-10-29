<template>
  <div class="comptabilite fade-in">

    <!-- ── En-tête ────────────────────────────────────────────────────────── -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Comptabilité</h1>
        <p class="page-sub">Analyse de votre activité financière</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost btn-sm" @click="exportCSV">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Exporter CSV
        </button>
        <button class="btn btn-secondary btn-sm" @click="openNewDepense">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouvelle dépense
        </button>
        <RouterLink to="/facturation" class="btn btn-primary btn-sm">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouvelle facture
        </RouterLink>
      </div>
    </div>

    <!-- ── Filtres période ─────────────────────────────────────────────────── -->
    <div class="filters-card card">
      <div class="period-nav">
        <button class="btn btn-ghost btn-icon btn-sm" @click="prevPeriod">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span class="period-label">{{ periodLabel }}</span>
        <button class="btn btn-ghost btn-icon btn-sm" @click="nextPeriod" :disabled="isCurrentPeriod">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <div class="period-type-tabs">
        <button v-for="t in periodTypes" :key="t.value" class="period-tab" :class="{ active: periodType === t.value }" @click="setPeriodType(t.value)">
          {{ t.label }}
        </button>
      </div>

      <template v-if="periodType === 'custom'">
        <input v-model="customFrom" type="date" class="form-input filter-date" />
        <span style="color:var(--color-text-muted);font-size:var(--text-sm)">→</span>
        <input v-model="customTo" type="date" class="form-input filter-date" />
      </template>

      <button class="btn btn-ghost btn-sm" @click="resetFilters">Réinitialiser</button>
    </div>

    <!-- ── KPIs ────────────────────────────────────────────────────────────── -->
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon--blue">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
        </div>
        <div>
          <div class="kpi-value">{{ formatMoney(kpis.ca) }}</div>
          <div class="kpi-label">Chiffre d'affaires</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon--green">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <div class="kpi-value">{{ formatMoney(kpis.encaisse) }}</div>
          <div class="kpi-label">Encaissé</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon--orange">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div>
          <div class="kpi-value">{{ formatMoney(kpis.attente) }}</div>
          <div class="kpi-label">En attente</div>
        </div>
      </div>
      <div class="kpi-card kpi-card--depense">
        <div class="kpi-icon kpi-icon--red">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
          </svg>
        </div>
        <div>
          <div class="kpi-value kpi-value--red">{{ formatMoney(kpis.totalDepenses) }}</div>
          <div class="kpi-label">Total dépenses</div>
        </div>
      </div>
      <div class="kpi-card" :class="kpis.resultat >= 0 ? 'kpi-card--positive' : 'kpi-card--negative'">
        <div class="kpi-icon" :class="kpis.resultat >= 0 ? 'kpi-icon--emerald' : 'kpi-icon--red'">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline v-if="kpis.resultat >= 0" points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline v-else points="23 18 13.5 8.5 8.5 13.5 1 6"/>
            <polyline v-if="kpis.resultat >= 0" points="17 6 23 6 23 12"/>
            <polyline v-else points="17 18 23 18 23 12"/>
          </svg>
        </div>
        <div>
          <div class="kpi-value" :class="kpis.resultat >= 0 ? 'kpi-value--green' : 'kpi-value--red'">
            {{ formatMoney(kpis.resultat) }}
          </div>
          <div class="kpi-label">Résultat net</div>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon kpi-icon--purple">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div>
          <div class="kpi-value">{{ kpis.nbFactures }}</div>
          <div class="kpi-label">Factures</div>
        </div>
      </div>
    </div>

    <!-- ── Onglets Recettes / Dépenses ────────────────────────────────────── -->
    <div class="section-tabs">
      <button class="section-tab" :class="{ active: activeTab === 'recettes' }" @click="activeTab = 'recettes'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
        </svg>
        Recettes
        <span class="tab-count">{{ filteredFactures.length }}</span>
      </button>
      <button class="section-tab section-tab--depense" :class="{ active: activeTab === 'depenses' }" @click="activeTab = 'depenses'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
        </svg>
        Dépenses
        <span class="tab-count tab-count--red">{{ filteredDepenses.length }}</span>
      </button>
    </div>

    <!-- ── Tableau Recettes ───────────────────────────────────────────────── -->
    <div v-if="activeTab === 'recettes'" class="card">
      <div class="card-header">
        <h3 class="card-title">Recettes</h3>
        <div class="card-header-right">
          <select v-model="filterActe" class="form-input filter-select-sm">
            <option value="">Tous les actes</option>
            <option v-for="t in facturationStore.acteTypes" :key="t.id" :value="t.label">{{ t.label }}</option>
          </select>
          <select v-model="filterMode" class="form-input filter-select-sm">
            <option value="">Tous les modes</option>
            <option v-for="m in MODES_PAIEMENT" :key="m.value" :value="m.value">{{ m.label }}</option>
          </select>
          <span class="results-count">{{ filteredFactures.length }} résultat(s)</span>
        </div>
      </div>

      <div v-if="filteredFactures.length === 0" class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:.3">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
        <p>Aucune facture sur cette période</p>
      </div>

      <table v-else class="compta-table">
        <thead>
          <tr>
            <th>Date</th><th>Patient</th><th>Actes</th><th>Montant</th><th>Mode</th><th>Statut</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in filteredFactures" :key="f.id" class="table-row" @click="goToFacture(f)">
            <td class="td-date">{{ formatDate(f.date) }}</td>
            <td class="td-bold">{{ getPatientName(f.patientId, f) }}<span class="td-muted"> · {{ f.genre === 'avoir' ? 'Avoir' : 'N°' }} {{ f.numero }}</span></td>
            <td class="td-muted td-clip">{{ f.actes.map(a => a.label).join(', ') || '—' }}</td>
            <td class="td-amount td-bold">{{ formatMoney(f.total) }}</td>
            <td><span class="chip">{{ getModeLabel(f.modePaiement) }}</span></td>
            <td>
              <span class="statut-badge" :class="f.statut === 'paye' ? 'statut-paye' : 'statut-attente'">
                {{ f.statut === 'paye' ? 'Payé' : 'En attente' }}
              </span>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="table-footer">
            <td colspan="3"><strong>Total recettes</strong></td>
            <td class="td-amount"><strong>{{ formatMoney(kpis.ca) }}</strong></td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- ── Tableau Dépenses ───────────────────────────────────────────────── -->
    <div v-if="activeTab === 'depenses'" class="card">
      <div class="card-header">
        <h3 class="card-title">Dépenses</h3>
        <div class="card-header-right">
          <select v-model="filterCategorie" class="form-input filter-select-sm">
            <option value="">Toutes les catégories</option>
            <option v-for="c in CATEGORIES_DEPENSES" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
          <span class="results-count">{{ filteredDepenses.length }} résultat(s)</span>
          <button class="btn btn-secondary btn-sm" @click="openNewDepense">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ajouter
          </button>
        </div>
      </div>

      <div v-if="filteredDepenses.length === 0" class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:.3">
          <rect x="2" y="5" width="20" height="14" rx="2"/>
          <line x1="2" y1="10" x2="22" y2="10"/>
        </svg>
        <p>Aucune dépense sur cette période</p>
        <button class="btn btn-secondary btn-sm" @click="openNewDepense" style="margin-top:12px">
          Ajouter une dépense
        </button>
      </div>

      <table v-else class="compta-table">
        <thead>
          <tr>
            <th>Date</th><th>Libellé</th><th>Catégorie</th><th>Montant</th><th>Détail</th><th style="width:80px"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in filteredDepenses" :key="d.id" class="table-row" @click="openEditDepense(d)">
            <td class="td-date">{{ formatDate(d.date) }}</td>
            <td class="td-bold">
              {{ d.libelle || '—' }}
              <span v-if="d.typeDepense === 'kilometrique'" class="km-badge">🚗 km</span>
              <span v-if="d.recurrenceGroupId" class="recur-badge" title="Dépense récurrente">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
              </span>
            </td>
            <td><span class="chip chip--categorie">{{ getCategorieLabel(d.categorie) }}</span></td>
            <td class="td-amount td-bold td-red">{{ formatMoney(d.montant) }}</td>
            <td class="td-muted td-detail">
              <template v-if="d.typeDepense === 'kilometrique'">
                {{ d.kmDistance }} km
                <span v-if="d.kmAllerRetour" class="chip chip--ar">A/R</span>
                × {{ d.kmNbTrajets }} trajet{{ d.kmNbTrajets > 1 ? 's' : '' }}
                · {{ d.kmTaux }} €/km
              </template>
              <template v-else>{{ d.notes || '—' }}</template>
            </td>
            <td class="td-actions" @click.stop>
              <button class="btn btn-ghost btn-icon btn-sm" title="Dupliquer" @click="duplicateDepense(d)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
              </button>
              <button class="btn btn-ghost btn-icon btn-sm" title="Supprimer" @click="askDeleteDepense(d)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="table-footer">
            <td colspan="3"><strong>Total dépenses</strong></td>
            <td class="td-amount td-red"><strong>{{ formatMoney(kpis.totalDepenses) }}</strong></td>
            <td colspan="2"></td>
          </tr>
        </tfoot>
      </table>

      <!-- Répartition par catégorie -->
      <div v-if="filteredDepenses.length > 0" class="categorie-breakdown">
        <h4 class="breakdown-title">Répartition par catégorie</h4>
        <div class="breakdown-list">
          <div v-for="item in depensesParCategorie" :key="item.value" class="breakdown-item">
            <div class="breakdown-bar-wrap">
              <div class="breakdown-bar" :style="{ width: item.pct + '%' }"></div>
            </div>
            <span class="breakdown-label">{{ item.label }}</span>
            <span class="breakdown-amount">{{ formatMoney(item.total) }}</span>
            <span class="breakdown-pct">{{ item.pct.toFixed(0) }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════
         MODAL : Dépense
    ══════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showDepenseModal" class="modal-overlay" @click.self="closeDepenseModal">
          <div class="modal">
            <div class="modal-header">
              <h2 class="modal-title">{{ editingDepenseId ? 'Modifier la dépense' : 'Nouvelle dépense' }}</h2>
              <button class="btn btn-ghost btn-icon" @click="closeDepenseModal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">

              <!-- ── Type de dépense ── -->
              <div class="type-toggle">
                <button
                  class="type-btn"
                  :class="{ active: depenseDraft.typeDepense === 'standard' }"
                  @click="depenseDraft.typeDepense = 'standard'"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                  </svg>
                  Dépense standard
                </button>
                <button
                  class="type-btn type-btn--km"
                  :class="{ active: depenseDraft.typeDepense === 'kilometrique' }"
                  @click="depenseDraft.typeDepense = 'kilometrique'; depenseDraft.categorie = 'transport'"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/>
                    <path d="M1 18h2m14 0h6M5 15V9l3-4h8l3 4v6"/>
                  </svg>
                  Frais kilométriques
                </button>
              </div>

              <!-- ── Champs communs ── -->
              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Date *</label>
                  <input v-model="depenseDraft.date" type="date" class="form-input" />
                </div>
                <div class="form-group">
                  <label class="form-label">Catégorie</label>
                  <select v-model="depenseDraft.categorie" class="form-input">
                    <option v-for="c in CATEGORIES_DEPENSES" :key="c.value" :value="c.value">{{ c.label }}</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Libellé *</label>
                <input
                  v-model="depenseDraft.libelle"
                  class="form-input"
                  :placeholder="depenseDraft.typeDepense === 'kilometrique' ? 'Ex : Déplacement patient domicile, formation…' : 'Ex : Achat semelles, loyer cabinet…'"
                />
              </div>

              <!-- ── Section standard ── -->
              <div v-if="depenseDraft.typeDepense === 'standard'" class="form-group">
                <label class="form-label">Montant (€) *</label>
                <input v-model.number="depenseDraft.montant" type="number" min="0" step="0.01" class="form-input" placeholder="0,00" />
              </div>

              <!-- ── Section kilométrique ── -->
              <div v-else class="km-section">
                <div class="km-grid">
                  <div class="form-group">
                    <label class="form-label">Distance par trajet (km)</label>
                    <input v-model.number="depenseDraft.kmDistance" type="number" min="1" step="0.5" class="form-input" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Nombre de trajets</label>
                    <input v-model.number="depenseDraft.kmNbTrajets" type="number" min="1" step="1" class="form-input" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Taux (€/km)</label>
                    <input v-model.number="depenseDraft.kmTaux" type="number" min="0" step="0.001" class="form-input" />
                  </div>
                </div>

                <!-- Aller-retour -->
                <label class="ar-toggle">
                  <input type="checkbox" v-model="depenseDraft.kmAllerRetour" class="ar-checkbox" />
                  <span class="ar-box">
                    <svg v-if="depenseDraft.kmAllerRetour" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  <span class="ar-label">Aller-retour <span class="ar-hint">(distance × 2)</span></span>
                </label>

                <!-- Récapitulatif calculé -->
                <div class="km-recap">
                  <div class="km-recap-detail">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/>
                      <path d="M1 18h2m14 0h6M5 15V9l3-4h8l3 4v6"/>
                    </svg>
                    {{ kmDetailLabel }}
                    · {{ depenseDraft.kmTaux }} €/km
                  </div>
                  <div class="km-recap-total">
                    = <strong>{{ formatMoney(kmMontantCalc) }}</strong>
                  </div>
                </div>
              </div>

              <!-- Notes -->
              <div class="form-group">
                <label class="form-label">Notes</label>
                <textarea v-model="depenseDraft.notes" class="form-textarea" rows="2" placeholder="Précisions, référence, destination…" />
              </div>

              <!-- ── Récurrence (création seulement) ── -->
              <div v-if="!editingDepenseId" class="recurrence-section">
                <label class="recurrence-toggle-row" @click="recurrenceEnabled = !recurrenceEnabled">
                  <span class="toggle-track" :class="{ 'toggle-track--on': recurrenceEnabled }">
                    <span class="toggle-thumb"></span>
                  </span>
                  <span class="recurrence-toggle-label">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="23 4 23 10 17 10"/>
                      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                    </svg>
                    Activer la récurrence
                  </span>
                </label>

                <div v-if="recurrenceEnabled" class="recurrence-options">
                  <div class="form-row-2">
                    <div class="form-group">
                      <label class="form-label">Fréquence</label>
                      <select v-model="depenseDraft.recurrenceFreq" class="form-input">
                        <option v-for="f in RECURRENCE_FREQS" :key="f.value" :value="f.value">{{ f.label }}</option>
                      </select>
                    </div>
                    <div class="form-group">
                      <label class="form-label">Nombre d'occurrences</label>
                      <input v-model.number="depenseDraft.recurrenceNb" type="number" min="2" max="60" class="form-input" />
                    </div>
                  </div>

                  <div v-if="recurrenceDates.length" class="recurrence-preview">
                    <div class="recurrence-preview-header">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {{ recurrenceDates.length }} dépense{{ recurrenceDates.length > 1 ? 's' : '' }} seront créées :
                    </div>
                    <div class="recurrence-dates-list">
                      <span v-for="d in recurrenceDates.slice(0, 6)" :key="d" class="recurrence-date-chip">
                        {{ formatDate(d) }}
                      </span>
                      <span v-if="recurrenceDates.length > 6" class="recurrence-more">
                        + {{ recurrenceDates.length - 6 }} autres
                      </span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" @click="closeDepenseModal">Annuler</button>
              <button class="btn btn-primary" @click="saveDepense" :disabled="!isDepenseValid">
                <template v-if="recurrenceEnabled && recurrenceDates.length > 1">
                  Créer {{ recurrenceDates.length }} dépenses
                </template>
                <template v-else>
                  {{ editingDepenseId ? 'Mettre à jour' : 'Enregistrer' }}
                </template>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ── Modal confirmation suppression dépense ─────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="depenseToDelete" class="modal-overlay" @click.self="depenseToDelete = null">
          <div class="modal modal-sm">
            <h3>Supprimer cette dépense ?</h3>
            <p><strong>{{ depenseToDelete.libelle }}</strong> — {{ formatMoney(depenseToDelete.montant) }}<br>Cette action est irréversible.</p>
            <div class="modal-actions">
              <button class="btn btn-ghost" @click="depenseToDelete = null">Annuler</button>
              <button class="btn btn-danger" @click="doDeleteDepense">Supprimer</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useFacturationStore, MODES_PAIEMENT, CATEGORIES_DEPENSES } from '@/store/facturation.js'
import { usePatientStore } from '@/store/patients.js'
import { useUIStore } from '@/store/ui.js'

const facturationStore = useFacturationStore()
const patientStore     = usePatientStore()
const uiStore          = useUIStore()
const router           = useRouter()

// ── Onglet actif ──────────────────────────────────────────────────────────────
const activeTab = ref('recettes')

// ── Période ───────────────────────────────────────────────────────────────────
const periodTypes = [
  { value: 'month',  label: 'Mois' },
  { value: 'year',   label: 'Année' },
  { value: 'custom', label: 'Personnalisé' },
]

const periodType  = ref('month')
const currentDate = ref(new Date())
const customFrom  = ref('')
const customTo    = ref('')

function setPeriodType(t) {
  periodType.value = t
  currentDate.value = new Date()
}

function prevPeriod() {
  const d = new Date(currentDate.value)
  if (periodType.value === 'month') d.setMonth(d.getMonth() - 1)
  else d.setFullYear(d.getFullYear() - 1)
  currentDate.value = d
}

function nextPeriod() {
  const d = new Date(currentDate.value)
  if (periodType.value === 'month') d.setMonth(d.getMonth() + 1)
  else d.setFullYear(d.getFullYear() + 1)
  currentDate.value = d
}

const isCurrentPeriod = computed(() => {
  const now = new Date()
  const c = currentDate.value
  if (periodType.value === 'month') return c.getMonth() === now.getMonth() && c.getFullYear() === now.getFullYear()
  return c.getFullYear() === now.getFullYear()
})

const periodLabel = computed(() => {
  if (periodType.value === 'custom') return 'Plage personnalisée'
  if (periodType.value === 'year') return currentDate.value.getFullYear().toString()
  return currentDate.value.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
})

function periodRange() {
  if (periodType.value === 'custom') {
    return {
      from: customFrom.value ? new Date(customFrom.value) : null,
      to:   customTo.value   ? new Date(customTo.value + 'T23:59:59') : null,
    }
  }
  const c = currentDate.value
  if (periodType.value === 'year') {
    return { from: new Date(c.getFullYear(), 0, 1), to: new Date(c.getFullYear(), 11, 31, 23, 59, 59) }
  }
  return { from: new Date(c.getFullYear(), c.getMonth(), 1), to: new Date(c.getFullYear(), c.getMonth() + 1, 0, 23, 59, 59) }
}

function resetFilters() {
  filterActe.value = ''
  filterMode.value = ''
  filterCategorie.value = ''
  periodType.value = 'month'
  currentDate.value = new Date()
  customFrom.value = ''
  customTo.value = ''
}

// ── Filtres recettes ──────────────────────────────────────────────────────────
const filterActe = ref('')
const filterMode = ref('')

const filteredFactures = computed(() => {
  const { from, to } = periodRange()
  // Recettes : factures émises et avoirs (les brouillons ne comptent pas)
  return facturationStore.facturesEmises.filter(f => {
    const d = new Date(f.date)
    if (from && d < from) return false
    if (to   && d > to)   return false
    if (filterMode.value && f.modePaiement !== filterMode.value) return false
    if (filterActe.value && !(f.actes || []).some(a => a.label === filterActe.value)) return false
    return true
  })
})

// ── Filtres dépenses ──────────────────────────────────────────────────────────
const filterCategorie = ref('')

const filteredDepenses = computed(() => {
  const { from, to } = periodRange()
  return facturationStore.depensesSorted.filter(d => {
    const date = new Date(d.date)
    if (from && date < from) return false
    if (to   && date > to)   return false
    if (filterCategorie.value && d.categorie !== filterCategorie.value) return false
    return true
  })
})

// ── KPIs ──────────────────────────────────────────────────────────────────────
const kpis = computed(() => {
  const list = filteredFactures.value
  const ca            = list.reduce((s, f) => s + (Number(f.total) || 0), 0)
  const encaisse      = list.filter(f => f.statut === 'paye').reduce((s, f) => s + (Number(f.total) || 0), 0)
  const attente       = list.filter(f => f.statut !== 'paye').reduce((s, f) => s + (Number(f.total) || 0), 0)
  const nb            = list.length
  const totalDepenses = filteredDepenses.value.reduce((s, d) => s + (Number(d.montant) || 0), 0)
  const resultat      = encaisse - totalDepenses
  return { ca, encaisse, attente, nbFactures: nb, totalDepenses, resultat }
})

// ── Répartition dépenses par catégorie ───────────────────────────────────────
const depensesParCategorie = computed(() => {
  const totaux = {}
  filteredDepenses.value.forEach(d => {
    totaux[d.categorie] = (totaux[d.categorie] || 0) + (Number(d.montant) || 0)
  })
  const total = Object.values(totaux).reduce((s, v) => s + v, 0)
  return Object.entries(totaux)
    .map(([value, t]) => ({
      value,
      label: getCategorieLabel(value),
      total: t,
      pct:   total > 0 ? (t / total) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total)
})

// ── Helpers ───────────────────────────────────────────────────────────────────
function getPatientName(id, facture) {
  const p = patientStore.patients.find(p => p.id === id) || facture?.patientFige
  return p ? `${p.prenom} ${p.nom}` : '—'
}
function getModeLabel(val) {
  return MODES_PAIEMENT.find(m => m.value === val)?.label ?? val
}
function getCategorieLabel(val) {
  return CATEGORIES_DEPENSES.find(c => c.value === val)?.label ?? val
}
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatMoney(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0)
}

function goToFacture(f) {
  router.push({ name: 'Facturation', query: { editId: f.id } })
}

// ── CRUD Dépenses ─────────────────────────────────────────────────────────────
const showDepenseModal  = ref(false)
const editingDepenseId  = ref(null)
const depenseToDelete   = ref(null)

const depenseDraft = reactive({
  date:              new Date().toISOString().split('T')[0],
  libelle:           '',
  categorie:         'autre',
  montant:           null,
  notes:             '',
  // champs frais kilométriques
  typeDepense:       'standard',   // 'standard' | 'kilometrique'
  kmDistance:        10,
  kmNbTrajets:       1,
  kmAllerRetour:     false,
  kmTaux:            0.636,        // taux fiscal 2024 (5 CV, <5000 km)
  // récurrence
  recurrenceFreq:    'mensuelle',
  recurrenceNb:      3,
})

const recurrenceEnabled = ref(false)

const RECURRENCE_FREQS = [
  { value: 'hebdomadaire',  label: 'Hebdomadaire'  },
  { value: 'mensuelle',     label: 'Mensuelle'     },
  { value: 'trimestrielle', label: 'Trimestrielle' },
  { value: 'semestrielle',  label: 'Semestrielle'  },
  { value: 'annuelle',      label: 'Annuelle'      },
]

const recurrenceDates = computed(() => {
  if (!recurrenceEnabled.value || editingDepenseId.value) return []
  const nb = Math.max(2, Math.min(60, Number(depenseDraft.recurrenceNb) || 2))
  const base = new Date(depenseDraft.date)
  if (isNaN(base)) return []
  const dates = []
  for (let i = 0; i < nb; i++) {
    const d = new Date(base)
    switch (depenseDraft.recurrenceFreq) {
      case 'hebdomadaire':  d.setDate(d.getDate() + i * 7);         break
      case 'mensuelle':     d.setMonth(d.getMonth() + i);           break
      case 'trimestrielle': d.setMonth(d.getMonth() + i * 3);       break
      case 'semestrielle':  d.setMonth(d.getMonth() + i * 6);       break
      case 'annuelle':      d.setFullYear(d.getFullYear() + i);     break
    }
    dates.push(d.toISOString().split('T')[0])
  }
  return dates
})

// Recalcul automatique du montant quand les champs km changent
const kmMontantCalc = computed(() => {
  const dist   = Number(depenseDraft.kmDistance)  || 0
  const trajets= Number(depenseDraft.kmNbTrajets) || 0
  const taux   = Number(depenseDraft.kmTaux)      || 0
  const coeff  = depenseDraft.kmAllerRetour ? 2 : 1
  return Math.round(dist * coeff * trajets * taux * 100) / 100
})

const kmDetailLabel = computed(() => {
  const dist   = Number(depenseDraft.kmDistance)  || 0
  const trajets= Number(depenseDraft.kmNbTrajets) || 0
  const coeff  = depenseDraft.kmAllerRetour ? 2 : 1
  const total  = dist * coeff * trajets
  const ar     = depenseDraft.kmAllerRetour ? ' × 2 (A/R)' : ''
  return `${dist} km${ar} × ${trajets} trajet${trajets > 1 ? 's' : ''} = ${total} km`
})

watch(kmMontantCalc, (v) => {
  if (depenseDraft.typeDepense === 'kilometrique') depenseDraft.montant = v
})

const isDepenseValid = computed(() => {
  if (!depenseDraft.libelle.trim() || !depenseDraft.date) return false
  if (depenseDraft.typeDepense === 'kilometrique') return kmMontantCalc.value > 0
  return depenseDraft.montant > 0
})

function openNewDepense() {
  editingDepenseId.value = null
  Object.assign(depenseDraft, {
    date:              new Date().toISOString().split('T')[0],
    libelle:           '',
    categorie:         'transport',
    montant:           null,
    notes:             '',
    typeDepense:       'standard',
    kmDistance:        10,
    kmNbTrajets:       1,
    kmAllerRetour:     false,
    kmTaux:            0.636,
    recurrenceFreq:    'mensuelle',
    recurrenceNb:      3,
  })
  recurrenceEnabled.value = false
  showDepenseModal.value = true
  activeTab.value = 'depenses'
}

function openEditDepense(d) {
  editingDepenseId.value = d.id
  Object.assign(depenseDraft, {
    date:              d.date,
    libelle:           d.libelle,
    categorie:         d.categorie,
    montant:           d.montant,
    notes:             d.notes         || '',
    typeDepense:       d.typeDepense   || 'standard',
    kmDistance:        d.kmDistance    ?? 10,
    kmNbTrajets:       d.kmNbTrajets   ?? 1,
    kmAllerRetour:     d.kmAllerRetour ?? false,
    kmTaux:            d.kmTaux        ?? 0.636,
    recurrenceFreq:    'mensuelle',
    recurrenceNb:      3,
  })
  recurrenceEnabled.value = false
  showDepenseModal.value = true
}

function closeDepenseModal() {
  showDepenseModal.value = false
  editingDepenseId.value = null
  recurrenceEnabled.value = false
}

async function saveDepense() {
  if (!isDepenseValid.value) return
  const montantFinal = depenseDraft.typeDepense === 'kilometrique' ? kmMontantCalc.value : depenseDraft.montant
  const basePayload = {
    libelle:       depenseDraft.libelle,
    categorie:     depenseDraft.categorie,
    montant:       montantFinal,
    notes:         depenseDraft.notes,
    typeDepense:   depenseDraft.typeDepense,
    kmDistance:    depenseDraft.typeDepense === 'kilometrique' ? depenseDraft.kmDistance    : null,
    kmNbTrajets:   depenseDraft.typeDepense === 'kilometrique' ? depenseDraft.kmNbTrajets   : null,
    kmAllerRetour: depenseDraft.typeDepense === 'kilometrique' ? depenseDraft.kmAllerRetour : null,
    kmTaux:        depenseDraft.typeDepense === 'kilometrique' ? depenseDraft.kmTaux        : null,
  }

  try {
    if (editingDepenseId.value) {
      await facturationStore.updateDepense(editingDepenseId.value, { ...basePayload, date: depenseDraft.date })
      uiStore.success('Dépense mise à jour')
    } else if (recurrenceEnabled.value && recurrenceDates.value.length > 1) {
      await facturationStore.createDepense({
        ...basePayload,
        date: depenseDraft.date,
        recurrenceDates: recurrenceDates.value,
        recurrenceFreq: depenseDraft.recurrenceFreq,
      })
      uiStore.success(`${recurrenceDates.value.length} dépenses récurrentes créées`)
    } else {
      await facturationStore.createDepense({ ...basePayload, date: depenseDraft.date })
      uiStore.success('Dépense enregistrée')
    }
    closeDepenseModal()
  } catch (err) {
    uiStore.error(err.message || 'Impossible d\'enregistrer la dépense')
  }
}

async function duplicateDepense(d) {
  try {
    await facturationStore.createDepense({
      date:          new Date().toISOString().split('T')[0],
      libelle:       d.libelle,
      categorie:     d.categorie,
      montant:       d.montant,
      notes:         d.notes || '',
      typeDepense:   d.typeDepense  || 'standard',
      kmDistance:    d.kmDistance   ?? null,
      kmNbTrajets:   d.kmNbTrajets  ?? null,
      kmAllerRetour: d.kmAllerRetour ?? null,
      kmTaux:        d.kmTaux        ?? null,
    })
    uiStore.success(`"${d.libelle}" dupliquée`)
  } catch (err) {
    uiStore.error(err.message || 'Impossible de dupliquer la dépense')
  }
}

function askDeleteDepense(d) { depenseToDelete.value = d }
async function doDeleteDepense() {
  try {
    await facturationStore.deleteDepense(depenseToDelete.value.id)
    uiStore.success('Dépense supprimée')
    depenseToDelete.value = null
  } catch (err) {
    uiStore.error(err.message || 'Impossible de supprimer la dépense')
  }
}

// ── Export CSV (recettes + dépenses) ─────────────────────────────────────────
function exportCSV() {
  const rowsRecettes = filteredFactures.value.map(f => [
    f.date, (f.genre === 'avoir' ? 'Avoir ' : 'Facture ') + f.numero, getPatientName(f.patientId, f),
    (f.actes || []).map(a => a.label).join(' | '),
    f.total, getModeLabel(f.modePaiement),
    f.statut === 'paye' ? 'Payé' : 'En attente', '',
  ])
  const rowsDepenses = filteredDepenses.value.map(d => [
    d.date, 'Dépense', '', d.libelle,
    -Math.abs(d.montant), '', '', getCategorieLabel(d.categorie),
  ])
  const header = ['Date', 'Type', 'Patient', 'Libellé / Actes', 'Montant', 'Mode paiement', 'Statut', 'Catégorie']
  const all = [...rowsRecettes, ...rowsDepenses].sort((a, b) => b[0].localeCompare(a[0]))
  const csv = [header, ...all].map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `comptabilite_${periodLabel.value.replace(/ /g, '_')}.csv`
  a.click()
  URL.revokeObjectURL(url)
  uiStore.success('Export CSV téléchargé')
}
</script>

<style scoped>
.comptabilite { max-width: 1200px; margin: 0 auto; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  flex-wrap: wrap; gap: var(--space-md); margin-bottom: var(--space-xl);
}
.page-title { font-size: var(--text-2xl); font-weight: 800; color: var(--color-text); }
.page-sub   { font-size: var(--text-sm); color: var(--color-text-muted); margin-top: 4px; }
.header-actions { display: flex; gap: var(--space-sm); flex-wrap: wrap; }

/* Filtres */
.filters-card {
  display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap;
  padding: var(--space-md); margin-bottom: var(--space-lg);
}
.period-nav { display: flex; align-items: center; gap: 8px; }
.period-label { font-size: var(--text-sm); font-weight: 700; min-width: 130px; text-align: center; color: var(--color-text); }
.period-type-tabs { display: flex; gap: 4px; }
.period-tab {
  padding: 5px 14px; border-radius: var(--radius-full);
  font-size: var(--text-xs); font-weight: 600;
  background: var(--color-surface-alt); border: 1px solid var(--color-border);
  color: var(--color-text-muted); cursor: pointer; transition: all var(--transition-fast);
}
.period-tab.active { background: var(--color-primary); border-color: var(--color-primary); color: white; }
.filter-date   { max-width: 140px; }
.filter-select { max-width: 160px; }

/* KPIs */
.kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--space-md); margin-bottom: var(--space-lg); }
.kpi-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-xl); padding: var(--space-md) var(--space-lg);
  display: flex; align-items: center; gap: 12px;
  box-shadow: var(--shadow-sm);
}
.kpi-card--depense   { border-color: #fca5a5; }
.kpi-card--positive  { border-color: #86efac; }
.kpi-card--negative  { border-color: #fca5a5; }

.kpi-icon {
  width: 40px; height: 40px; border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.kpi-icon--blue    { background: #EBF4FF; color: #2B6CB0; }
.kpi-icon--green   { background: #DCFCE7; color: #15803D; }
.kpi-icon--orange  { background: #FEF3C7; color: #92400E; }
.kpi-icon--red     { background: #fee2e2; color: #dc2626; }
.kpi-icon--emerald { background: #d1fae5; color: #059669; }
.kpi-icon--purple  { background: #EDE9FE; color: #6D28D9; }
.kpi-icon--teal    { background: #CCFBF1; color: #0D9488; }

.kpi-value         { font-size: var(--text-lg); font-weight: 800; color: var(--color-text); white-space: nowrap; }
.kpi-value--red    { color: #dc2626; }
.kpi-value--green  { color: #059669; }
.kpi-label         { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: 2px; }

/* Section tabs */
.section-tabs {
  display: flex; gap: 4px; margin-bottom: var(--space-md);
  border-bottom: 2px solid var(--color-border); padding-bottom: -2px;
}
.section-tab {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 20px; font-size: var(--text-sm); font-weight: 600;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  cursor: pointer; transition: all var(--transition-fast);
  color: var(--color-text-muted); background: transparent; border: none;
  border-bottom: 2px solid transparent; margin-bottom: -2px;
}
.section-tab:hover { color: var(--color-text); background: var(--color-surface-alt); }
.section-tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); }
.section-tab--depense.active { color: #dc2626; border-bottom-color: #dc2626; }
.tab-count { background: var(--color-surface-alt); border: 1px solid var(--color-border); border-radius: var(--radius-full); padding: 1px 8px; font-size: var(--text-xs); }
.tab-count--red { background: #fee2e2; border-color: #fca5a5; color: #dc2626; }

/* Tableau */
.card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-md); flex-wrap: wrap; gap: 8px; }
.card-title  { font-size: var(--text-lg); font-weight: 700; }
.card-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.filter-select-sm { max-width: 170px; padding: 6px 10px; font-size: var(--text-xs); }
.results-count { font-size: var(--text-xs); color: var(--color-text-muted); }

.compta-table { width: 100%; border-collapse: collapse; }
.compta-table th {
  text-align: left; padding: 9px 12px;
  font-size: var(--text-xs); font-weight: 700; text-transform: uppercase;
  letter-spacing: .05em; color: var(--color-text-muted);
  border-bottom: 2px solid var(--color-border);
}
.table-row { cursor: pointer; transition: background var(--transition-fast); }
.table-row:hover { background: var(--color-primary-light); }
.compta-table td { padding: 11px 12px; font-size: var(--text-sm); border-bottom: 1px solid var(--color-border); vertical-align: middle; }
.table-footer td { padding: 12px; border-top: 2px solid var(--color-border); background: var(--color-surface-alt); }

.td-date   { white-space: nowrap; font-weight: 600; }
.td-bold   { font-weight: 600; }
.td-muted  { color: var(--color-text-muted); }
.td-clip   { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-amount { font-weight: 700; white-space: nowrap; }
.td-red    { color: #dc2626; }
.td-actions{ display: flex; gap: 4px; }

.chip {
  display: inline-block; padding: 2px 10px; border-radius: var(--radius-full);
  font-size: var(--text-xs); font-weight: 600;
  background: var(--color-surface-alt); border: 1px solid var(--color-border); color: var(--color-text-muted);
}
.chip--categorie { background: #f3e8ff; border-color: #d8b4fe; color: #7c3aed; }
.statut-badge { display: inline-block; padding: 3px 10px; border-radius: var(--radius-full); font-size: var(--text-xs); font-weight: 700; }
.statut-paye    { background: #dcfce7; color: #15803d; }
.statut-attente { background: #fef3c7; color: #92400e; }

.empty-state {
  text-align: center; padding: var(--space-2xl);
  color: var(--color-text-muted); display: flex; flex-direction: column; align-items: center; gap: 8px;
}

/* Répartition catégories */
.categorie-breakdown {
  margin-top: var(--space-xl); padding-top: var(--space-lg);
  border-top: 1px solid var(--color-border);
}
.breakdown-title { font-size: var(--text-sm); font-weight: 700; color: var(--color-text-muted); text-transform: uppercase; letter-spacing: .05em; margin-bottom: var(--space-md); }
.breakdown-list  { display: flex; flex-direction: column; gap: 10px; }
.breakdown-item  { display: grid; grid-template-columns: 160px 1fr 90px 44px; align-items: center; gap: 12px; }
.breakdown-bar-wrap { background: var(--color-border); border-radius: var(--radius-full); height: 6px; overflow: hidden; }
.breakdown-bar  { height: 100%; background: #dc2626; border-radius: var(--radius-full); transition: width 400ms ease; }
.breakdown-label { font-size: var(--text-sm); color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.breakdown-amount{ font-size: var(--text-sm); font-weight: 700; color: #dc2626; text-align: right; }
.breakdown-pct   { font-size: var(--text-xs); color: var(--color-text-muted); text-align: right; }

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 9990;
  display: flex; align-items: center; justify-content: center; padding: var(--space-md);
}
.modal {
  background: var(--color-surface); border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl); width: 100%; max-width: 520px; max-height: 90dvh; overflow-y: auto;
}
.modal-sm { max-width: 420px; padding: var(--space-xl); }
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-xl) var(--space-xl) var(--space-md);
  border-bottom: 1px solid var(--color-border);
}
.modal-title { font-size: var(--text-xl); font-weight: 700; }
.modal-body  { padding: var(--space-xl); display: flex; flex-direction: column; gap: var(--space-md); }
.modal-footer {
  display: flex; justify-content: flex-end; gap: var(--space-sm);
  padding: var(--space-md) var(--space-xl) var(--space-xl);
  border-top: 1px solid var(--color-border);
}
.modal-sm h3 { font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-md); }
.modal-sm p  { color: var(--color-text-muted); line-height: 1.6; }
.modal-actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-xl); }

.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }
.form-group { display: flex; flex-direction: column; gap: 6px; }

/* ── Km badge & chip ── */
.km-badge {
  display: inline-block; margin-left: 6px;
  font-size: 10px; font-weight: 700; padding: 1px 7px;
  background: #fef3c7; color: #92400e; border-radius: var(--radius-full);
  border: 1px solid #fcd34d; vertical-align: middle;
}
.chip--ar { background: #fef3c7; border-color: #fcd34d; color: #92400e; }
.td-detail { font-size: var(--text-xs); white-space: nowrap; }

/* ── Type toggle ── */
.type-toggle {
  display: flex; gap: 8px;
  background: var(--color-surface-alt); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); padding: 4px;
}
.type-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 8px 14px; border-radius: var(--radius-sm);
  font-size: var(--text-sm); font-weight: 600; cursor: pointer;
  background: transparent; border: none; color: var(--color-text-muted);
  transition: all var(--transition-fast);
}
.type-btn:hover { color: var(--color-text); }
.type-btn.active { background: var(--color-surface); color: var(--color-primary); box-shadow: var(--shadow-sm); }
.type-btn--km.active { color: #92400e; background: #fef9c3; }

/* ── Section km ── */
.km-section { display: flex; flex-direction: column; gap: var(--space-md); }
.km-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: var(--space-md); }

.ar-toggle {
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  padding: 10px 14px; border-radius: var(--radius-md);
  background: var(--color-surface-alt); border: 1px solid var(--color-border);
  transition: background var(--transition-fast);
}
.ar-toggle:hover { background: #fef3c7; border-color: #fcd34d; }
.ar-checkbox { display: none; }
.ar-box {
  width: 18px; height: 18px; border-radius: 4px; flex-shrink: 0;
  border: 2px solid var(--color-border); background: var(--color-surface);
  display: flex; align-items: center; justify-content: center;
  transition: all var(--transition-fast);
}
.ar-checkbox:checked ~ .ar-box { background: #f59e0b; border-color: #f59e0b; color: white; }
.ar-label { font-size: var(--text-sm); font-weight: 600; color: var(--color-text); }
.ar-hint  { font-weight: 400; color: var(--color-text-muted); }

.km-recap {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;
  background: #fffbeb; border: 1px solid #fcd34d;
  border-radius: var(--radius-md); padding: 10px 16px;
}
.km-recap-detail { display: flex; align-items: center; gap: 6px; font-size: var(--text-sm); color: #92400e; }
.km-recap-total  { font-size: var(--text-lg); font-weight: 800; color: #92400e; }

/* ── Badge récurrent ── */
.recur-badge {
  display: inline-flex; align-items: center; justify-content: center;
  margin-left: 6px; width: 18px; height: 18px; border-radius: 50%;
  background: #ede9fe; color: #7c3aed; border: 1px solid #c4b5fd;
  vertical-align: middle; flex-shrink: 0;
}

/* ── Section récurrence (modal) ── */
.recurrence-section {
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.recurrence-toggle-row {
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  padding: 11px 14px;
  background: var(--color-surface-alt);
  transition: background var(--transition-fast);
  user-select: none;
}
.recurrence-toggle-row:hover { background: #ede9fe20; }

/* Toggle switch */
.toggle-track {
  flex-shrink: 0; position: relative;
  width: 34px; height: 19px; border-radius: 999px;
  background: var(--color-border); border: 1px solid var(--color-border);
  transition: background var(--transition-fast), border-color var(--transition-fast);
}
.toggle-track--on { background: var(--color-primary); border-color: var(--color-primary); }
.toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 13px; height: 13px; border-radius: 50%;
  background: white; box-shadow: 0 1px 3px rgba(0,0,0,.2);
  transition: transform var(--transition-fast);
}
.toggle-track--on .toggle-thumb { transform: translateX(15px); }

.recurrence-toggle-label {
  display: flex; align-items: center; gap: 6px;
  font-size: var(--text-sm); font-weight: 600; color: var(--color-text);
}

.recurrence-options {
  display: flex; flex-direction: column; gap: var(--space-md);
  padding: var(--space-md); border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}

.recurrence-preview {
  background: #f5f3ff; border: 1px solid #c4b5fd;
  border-radius: var(--radius-md); padding: 10px 14px;
  display: flex; flex-direction: column; gap: 8px;
}
.recurrence-preview-header {
  display: flex; align-items: center; gap: 6px;
  font-size: var(--text-xs); font-weight: 700; color: #7c3aed;
}
.recurrence-dates-list { display: flex; flex-wrap: wrap; gap: 5px; }
.recurrence-date-chip {
  padding: 2px 9px; border-radius: var(--radius-full);
  background: white; border: 1px solid #c4b5fd;
  font-size: var(--text-xs); font-weight: 600; color: #5b21b6;
}
.recurrence-more {
  padding: 2px 9px; border-radius: var(--radius-full);
  font-size: var(--text-xs); font-weight: 600; color: #7c3aed;
  background: #ede9fe; border: 1px solid #c4b5fd;
}

.fade-enter-active, .fade-leave-active { transition: opacity 180ms; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }

@media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px)  { .kpi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) {
  .kpi-grid          { grid-template-columns: 1fr 1fr; }
  .filters-card      { flex-direction: column; align-items: stretch; }
  .period-nav        { justify-content: center; }
  .period-type-tabs  { justify-content: center; }
  .breakdown-item    { grid-template-columns: 1fr 80px 40px; }
  .breakdown-bar-wrap{ display: none; }
  .form-row-2        { grid-template-columns: 1fr; }
  .km-grid           { grid-template-columns: 1fr 1fr; }
  .type-toggle       { flex-direction: column; }
}
@media (max-width: 480px) { .kpi-grid { grid-template-columns: 1fr; } }
</style>
