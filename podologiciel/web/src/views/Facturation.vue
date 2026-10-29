<template>
  <div class="facturation fade-in">

    <!-- ── En-tête ────────────────────────────────────────────────────────── -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Facturation</h1>
        <p class="page-sub">Brouillons modifiables, factures émises numérotées (2026-0001…) et avoirs</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-ghost btn-sm" @click="showRappelSettings = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Rappels
          <span v-if="facturationStore.facturesNeedingReminder.length" class="rappel-badge">
            {{ facturationStore.facturesNeedingReminder.length }}
          </span>
        </button>
        <button class="btn btn-ghost btn-sm" data-test="pennylane" @click="ouvrirPennylane">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 16l-4-4-4 4"/><path d="M12 12v9"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
          </svg>
          Pennylane
          <span v-if="facturationStore.facturesPourPennylane.length" class="rappel-badge">
            {{ facturationStore.facturesPourPennylane.length }}
          </span>
        </button>
        <button class="btn btn-ghost btn-sm" @click="showActeTypesModal = true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07 10 10 0 0 0 19.07 4.93z"/>
          </svg>
          Types d'actes
        </button>
        <button class="btn btn-primary" @click="openNewFacture">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Nouvelle facture
        </button>
      </div>
    </div>

    <!-- ── Bannière rappels ────────────────────────────────────────────────── -->
    <div v-if="facturationStore.facturesNeedingReminder.length" class="rappel-banner card">
      <div class="rappel-banner-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        {{ facturationStore.facturesNeedingReminder.length }} facture(s) en attente à relancer
      </div>
      <div class="rappel-list">
        <div
          v-for="f in facturationStore.facturesNeedingReminder"
          :key="f.id"
          class="rappel-item"
        >
          <div class="rappel-info">
            <strong>{{ getPatientName(f.patientId) }}</strong>
            <span>· {{ formatMoney(f.total) }} · {{ formatDate(f.date) }}</span>
          </div>
          <div class="rappel-actions">
            <button class="btn btn-ghost btn-sm" @click="openEditFacture(f)">Ouvrir</button>
            <button class="btn btn-sm btn-warning" @click="markReminded(f.id)">
              ✓ Rappel envoyé
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Filtres liste ──────────────────────────────────────────────────── -->
    <div class="filters-bar card">
      <div class="filter-group">
        <input v-model="searchQ" class="form-input filter-input" placeholder="Rechercher un patient…" />
      </div>
      <div class="filter-group">
        <select v-model="filterStatut" class="form-input filter-select">
          <option value="">Tous les statuts</option>
          <option value="paye">Payé</option>
          <option value="en_attente">En attente</option>
          <option value="brouillon">Brouillons</option>
          <option value="annulee">Annulées</option>
          <option value="avoir">Avoirs</option>
        </select>
      </div>
      <div class="filter-group">
        <select v-model="filterMode" class="form-input filter-select">
          <option value="">Tous les modes</option>
          <option v-for="m in MODES_PAIEMENT" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
      </div>
    </div>

    <!-- ── Liste des factures ─────────────────────────────────────────────── -->
    <div class="card table-card">
      <div v-if="filteredFactures.length === 0" class="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" style="opacity:.3">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
          <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <p>Aucune facture pour le moment</p>
        <button class="btn btn-primary btn-sm" @click="openNewFacture" style="margin-top:12px">
          Créer la première facture
        </button>
      </div>

      <table v-else class="factures-table">
        <thead>
          <tr>
            <th>N°</th>
            <th>Date</th>
            <th>Patient</th>
            <th>Actes</th>
            <th>Montant</th>
            <th>Mode</th>
            <th>Statut</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in filteredFactures" :key="f.id" class="table-row" @click="openEditFacture(f)">
            <td class="td-numero">
              <span v-if="f.numero" class="numero">{{ f.numero }}</span>
              <span v-else class="statut-badge statut-brouillon">Brouillon</span>
            </td>
            <td class="td-date">{{ formatDate(f.date) }}</td>
            <td class="td-patient">{{ getPatientName(f.patientId, f) }}</td>
            <td class="td-actes">{{ f.actes.map(a => a.label).join(', ') || '—' }}</td>
            <td class="td-amount">{{ formatMoney(f.total) }}</td>
            <td class="td-mode"><span class="mode-chip">{{ getModeLabel(f.modePaiement) }}</span></td>
            <td class="td-statut">
              <span v-if="f.genre === 'avoir'" class="statut-badge statut-avoir">Avoir</span>
              <span v-else-if="f.annuleeLe" class="statut-badge statut-annulee">Annulée</span>
              <span v-else class="statut-badge" :class="f.statut === 'paye' ? 'statut-paye' : 'statut-attente'">
                {{ f.statut === 'paye' ? 'Payé' : 'En attente' }}
              </span>
              <span v-if="f.pennylaneId" class="pl-chip pl-ok" :title="`Dans Pennylane depuis le ${formatDate(f.pennylaneEnvoyeLe)}`">Pennylane ✓</span>
              <span v-else-if="f.numero && f.pennylaneErreur && facturationStore.pennylane.connecte" class="pl-chip pl-ko" :title="f.pennylaneErreur">Pennylane !</span>
            </td>
            <td class="td-actions" @click.stop>
              <button v-if="f.numero" class="btn btn-ghost btn-icon btn-sm" title="Générer PDF" @click="generatePDF(f)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </button>
              <button v-if="f.numero && !f.pennylaneId && facturationStore.pennylane.connecte" class="btn btn-ghost btn-icon btn-sm"
                :disabled="envoisEnCours.has(f.id)" title="Envoyer à Pennylane" data-test="envoyer-pennylane" @click="envoyerUne(f)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
              <button v-if="!f.numero || (f.genre !== 'avoir' && !f.annuleeLe)" class="btn btn-ghost btn-icon btn-sm"
                :title="f.numero ? 'Annuler par un avoir' : 'Supprimer le brouillon'" @click="askDelete(f)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════
         MODAL : Formulaire de facture
    ══════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showFactureModal" class="modal-overlay" @click.self="closeModal">
          <div class="modal modal-lg">

            <div class="modal-header">
              <h2 class="modal-title">{{ modalTitle }}</h2>
              <button class="btn btn-ghost btn-icon" @click="closeModal">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <div v-if="locked" class="lock-banner">
                <strong>{{ editingFacture.genre === 'avoir' ? 'Avoir' : 'Facture' }} n° {{ editingFacture.numero }}</strong>, émis(e) le {{ formatDate(editingFacture.emiseLe || editingFacture.date) }}.
                Son contenu ne change plus (obligation légale) : seuls le paiement et la signature du PDF se modifient.
                <span v-if="editingFacture.genre !== 'avoir' && !editingFacture.annuleeLe">Pour l'annuler, fais un avoir (bouton corbeille de la liste).</span>
                <span v-if="editingFacture.annuleeLe"> Annulée le {{ formatDate(editingFacture.annuleeLe) }}.</span>
              </div>
              <!-- ── Info principale ── -->
              <div class="form-row-3">
                <div class="form-group">
                  <label class="form-label">Patient *</label>
                  <select v-model="draft.patientId" class="form-input" :disabled="locked">
                    <option value="">— Sélectionner —</option>
                    <option v-for="p in patientStore.sortedPatients" :key="p.id" :value="p.id">
                      {{ p.prenom }} {{ p.nom }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Date *</label>
                  <input v-model="draft.date" type="date" class="form-input" :disabled="locked" />
                </div>
                <div class="form-group">
                  <label class="form-label">Statut</label>
                  <div class="statut-toggle">
                    <button
                      class="statut-btn"
                      :class="draft.statut === 'paye' ? 'statut-btn--paye active' : 'statut-btn--paye'"
                      @click="draft.statut = 'paye'"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Payé
                    </button>
                    <button
                      class="statut-btn"
                      :class="draft.statut === 'en_attente' ? 'statut-btn--attente active' : 'statut-btn--attente'"
                      @click="draft.statut = 'en_attente'"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      En attente
                    </button>
                  </div>
                </div>
              </div>

              <!-- ── Actes ── -->
              <div class="actes-section">
                <div class="actes-header">
                  <h3 class="section-label">Actes facturés</h3>
                  <button v-if="!locked" class="btn btn-ghost btn-sm" @click="addActeFromType">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Ajouter un acte
                  </button>
                </div>

                <!-- Sélecteur rapide depuis les types -->
                <div v-if="showActePicker" class="acte-picker">
                  <div
                    v-for="t in facturationStore.acteTypes"
                    :key="t.id"
                    class="acte-picker-item"
                    @click="pickActeType(t)"
                  >
                    <span>{{ t.label }}</span>
                    <span class="acte-picker-price">{{ formatMoney(t.prix) }}</span>
                  </div>
                  <div class="acte-picker-item acte-picker-item--custom" @click="addBlankActe">
                    + Acte personnalisé
                  </div>
                </div>

                <!-- Liste des actes -->
                <div v-if="draft.actes.length" class="actes-list">
                  <div v-for="(acte, i) in draft.actes" :key="acte._key" class="acte-row">
                    <input v-model="acte.label" class="form-input acte-label" placeholder="Désignation de l'acte" :disabled="locked" @input="recalcTotal" />
                    <div class="acte-qty-group">
                      <label class="acte-sub-label">Qté</label>
                      <input v-model.number="acte.quantite" type="number" :min="locked ? undefined : 1" class="form-input acte-qty" :disabled="locked" @input="recalcTotal" />
                    </div>
                    <div class="acte-price-group">
                      <label class="acte-sub-label">Prix unit. (€)</label>
                      <input v-model.number="acte.prix" type="number" min="0" step="0.01" class="form-input acte-price" :disabled="locked" @input="recalcTotal" />
                    </div>
                    <div class="acte-line-total">{{ formatMoney(acte.quantite * acte.prix) }}</div>
                    <button v-if="!locked" class="btn btn-ghost btn-icon btn-sm acte-del" @click="removeActe(i)" title="Supprimer">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <div v-else class="actes-empty">Aucun acte ajouté — cliquez sur "Ajouter un acte"</div>

                <!-- Total -->
                <div class="total-row">
                  <label class="form-label">Total</label>
                  <strong class="total-value">{{ formatMoney(calculatedTotal) }}</strong>
                  <span class="total-calc-hint">Somme des actes (quantité × prix unitaire)</span>
                </div>
              </div>

              <!-- ── Mode paiement + notes ── -->
              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Mode de paiement</label>
                  <select v-model="draft.modePaiement" class="form-input">
                    <option v-for="m in MODES_PAIEMENT" :key="m.value" :value="m.value">{{ m.label }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Notes</label>
                  <input v-model="draft.notes" class="form-input" placeholder="Informations complémentaires…" :disabled="locked" />
                </div>
              </div>

              <!-- ── Signature / Tampon PDF ── -->
              <div class="form-group">
                <label class="form-label">Signature &amp; Tampon dans le PDF</label>
                <div class="sig-pick-row">
                  <button
                    v-for="opt in SIG_OPTIONS" :key="String(opt.value)"
                    type="button"
                    class="sig-pick-btn"
                    :class="{ active: draft.signatureOption === opt.value }"
                    @click="draft.signatureOption = opt.value"
                  >
                    <span class="sig-pick-icon">{{ opt.icon }}</span>
                    <span class="sig-pick-label">{{ opt.label }}</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn btn-ghost" @click="closeModal">Fermer</button>
              <template v-if="locked">
                <button class="btn btn-secondary" @click="generatePDF(editingFacture)">PDF</button>
                <button class="btn btn-primary" :disabled="saving" @click="saveFacture(false)">Enregistrer le paiement</button>
              </template>
              <template v-else>
                <button class="btn btn-ghost" :disabled="!isFormValid || saving" @click="saveFacture(false)">Enregistrer le brouillon</button>
                <button class="btn btn-secondary" :disabled="!canEmit || saving" @click="saveAndGeneratePDF">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  Émettre + PDF
                </button>
                <button class="btn btn-primary" :disabled="!canEmit || saving" title="Attribue le numéro définitif : la facture ne pourra plus être modifiée" @click="saveFacture(true)">
                  Émettre la facture
                </button>
              </template>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══════════════════════════════════════════════════════════════════
         MODAL : Gestion des types d'actes
    ══════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showActeTypesModal" class="modal-overlay" @click.self="showActeTypesModal = false">
          <div class="modal">
            <div class="modal-header">
              <h2 class="modal-title">Types d'actes</h2>
              <button class="btn btn-ghost btn-icon" @click="showActeTypesModal = false">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="acte-types-list">
                <div v-for="t in facturationStore.acteTypes" :key="t.id" class="acte-type-row">
                  <input v-model="t.label" class="form-input" placeholder="Libellé" @change="facturationStore.updateActeType(t.id, { label: t.label })" />
                  <input v-model.number="t.prix" type="number" min="0" step="0.01" class="form-input acte-type-price" placeholder="Prix" @change="facturationStore.updateActeType(t.id, { prix: t.prix })" />
                  <button class="btn btn-ghost btn-icon btn-sm" @click="facturationStore.deleteActeType(t.id)" title="Supprimer">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                    </svg>
                  </button>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" style="margin-top:12px" @click="facturationStore.createActeType({ label: '', prix: 0 })">
                + Ajouter un type
              </button>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" @click="showActeTypesModal = false">Fermer</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══════════════════════════════════════════════════════════════════
         MODAL : Paramètres rappels
    ══════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showRappelSettings" class="modal-overlay" @click.self="showRappelSettings = false">
          <div class="modal modal-sm" style="max-width:480px;padding:var(--space-xl)">
            <div class="modal-header" style="padding:0 0 var(--space-md)">
              <h2 class="modal-title">Paramètres des rappels</h2>
              <button class="btn btn-ghost btn-icon" @click="showRappelSettings = false">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style="display:flex;flex-direction:column;gap:var(--space-md);padding:var(--space-md) 0">
              <!-- Activer/désactiver -->
              <label class="rappel-toggle-row">
                <div>
                  <div class="form-label" style="margin:0">Rappels automatiques</div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Afficher les factures impayées à relancer</div>
                </div>
                <div class="toggle-switch" :class="{ on: facturationStore.rappelSettings.enabled }" @click="facturationStore.updateRappelSettings({ enabled: !facturationStore.rappelSettings.enabled })">
                  <div class="toggle-knob"/>
                </div>
              </label>

              <div class="form-group">
                <label class="form-label">Délai avant le 1er rappel</label>
                <div class="days-input-row">
                  <input
                    type="number" min="1" max="365"
                    :value="facturationStore.rappelSettings.firstReminderDays"
                    @change="facturationStore.updateRappelSettings({ firstReminderDays: +$event.target.value })"
                    class="form-input days-input"
                  />
                  <span class="days-label">jours après la date de facture</span>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Intervalle entre les rappels suivants</label>
                <div class="days-input-row">
                  <input
                    type="number" min="1" max="365"
                    :value="facturationStore.rappelSettings.repeatIntervalDays"
                    @change="facturationStore.updateRappelSettings({ repeatIntervalDays: +$event.target.value })"
                    class="form-input days-input"
                  />
                  <span class="days-label">jours entre chaque rappel</span>
                </div>
              </div>

              <div class="rappel-info-box">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Un rappel apparaît dans la bannière quand une facture « En attente » dépasse le délai configuré. Cliquez sur « ✓ Rappel envoyé » pour remettre le compteur à zéro.
              </div>
            </div>
            <div class="modal-actions">
              <button class="btn btn-primary" @click="showRappelSettings = false">Fermer</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══════════════════════════════════════════════════════════════════
         MODAL : Pennylane (facultatif)
    ══════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showPennylane" class="modal-overlay" @click.self="showPennylane = false">
          <div class="modal" style="max-width:560px">
            <div class="modal-header">
              <h2 class="modal-title">Pennylane</h2>
              <button class="btn btn-ghost btn-icon" @click="showPennylane = false">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div v-if="!facturationStore.pennylane.connecte" class="modal-body pl-body">
              <p>Si ta comptabilité est dans <strong>Pennylane</strong>, PodoLogiciel peut y envoyer tes factures et avoirs émis, avec leur numéro et leur PDF. Le patient y devient un client (nom et adresse seulement).</p>
              <div class="rappel-info-box">
                Pennylane n'est pas obligatoire : les factures de soins aux patients ne relèvent pas de la facture électronique. Ce lien sert seulement à ne pas ressaisir tes recettes.
              </div>
              <ol class="pl-etapes">
                <li>Dans Pennylane : <strong>Paramètres › Connectivité › Développeurs</strong>, « Générer un token API ».</li>
                <li>Coche les droits en écriture <strong>Clients</strong>, <strong>Factures clients</strong> et <strong>Fichiers</strong>.</li>
                <li>Copie la clé et colle-la ici.</li>
              </ol>
              <div class="form-group">
                <label class="form-label">Clé d'API Pennylane</label>
                <input v-model="jetonPennylane" type="password" autocomplete="off" class="form-input" placeholder="Colle ta clé ici" data-test="jeton-pennylane" />
              </div>
              <div class="form-group">
                <label class="form-label">Envoyer les factures émises à partir du</label>
                <input v-model="depuisPennylane" type="date" class="form-input" />
              </div>
            </div>

            <div v-else class="modal-body pl-body">
              <p>Relié à <strong>{{ facturationStore.pennylane.entreprise }}</strong>.</p>
              <label class="rappel-toggle-row">
                <div>
                  <div class="form-label" style="margin:0">Envoi automatique</div>
                  <div style="font-size:var(--text-xs);color:var(--color-text-muted)">Chaque facture part dans Pennylane dès qu'elle est émise</div>
                </div>
                <div class="toggle-switch" :class="{ on: facturationStore.pennylane.envoiAuto }" @click="regler({ envoiAuto: !facturationStore.pennylane.envoiAuto })">
                  <div class="toggle-knob"/>
                </div>
              </label>
              <div class="form-group">
                <label class="form-label">Envoyer les factures émises à partir du</label>
                <input :value="facturationStore.pennylane.depuis" type="date" class="form-input" @change="regler({ depuis: $event.target.value })" />
              </div>
              <div class="pl-a-envoyer">
                <span v-if="facturationStore.facturesPourPennylane.length">{{ facturationStore.facturesPourPennylane.length }} facture(s) ou avoir(s) pas encore dans Pennylane.</span>
                <span v-else>Toutes tes factures émises depuis cette date sont dans Pennylane.</span>
                <span v-if="progression" class="pl-progression">{{ progression }}</span>
              </div>
            </div>

            <div class="modal-footer">
              <template v-if="!facturationStore.pennylane.connecte">
                <button class="btn btn-ghost" @click="showPennylane = false">Fermer</button>
                <button class="btn btn-primary" :disabled="!jetonPennylane.trim() || plOccupe" data-test="connecter-pennylane" @click="connecter">Connecter</button>
              </template>
              <template v-else>
                <button class="btn btn-ghost" :disabled="plOccupe" @click="deconnecter">Déconnecter</button>
                <button class="btn btn-ghost" :disabled="plOccupe" @click="synchroClients">Mettre à jour les clients</button>
                <button class="btn btn-primary" :disabled="!facturationStore.facturesPourPennylane.length || plOccupe" data-test="tout-envoyer" @click="toutEnvoyer">Envoyer</button>
              </template>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ═══════════════════════════════════════════════════════════════════
         MODAL : Confirmation suppression
    ══════════════════════════════════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="factureToDelete" class="modal-overlay" @click.self="factureToDelete = null">
          <div class="modal modal-sm">
            <template v-if="factureToDelete.numero">
              <h3>Annuler la facture n° {{ factureToDelete.numero }} ?</h3>
              <p>Une facture émise ne se supprime pas. Un <strong>avoir</strong> numéroté de {{ formatMoney(-factureToDelete.total) }} va l'annuler ; les deux restent dans tes comptes.</p>
              <input v-model="motifAvoir" class="form-input" placeholder="Motif (facultatif) : erreur de montant, acte non réalisé…" />
            </template>
            <template v-else>
              <h3>Supprimer ce brouillon ?</h3>
              <p>Brouillon du <strong>{{ formatDate(factureToDelete.date) }}</strong> — {{ getPatientName(factureToDelete.patientId) }}</p>
            </template>
            <div class="modal-actions">
              <button class="btn btn-ghost" @click="factureToDelete = null">Retour</button>
              <button class="btn btn-danger" :disabled="saving" @click="doDelete">{{ factureToDelete.numero ? 'Créer l’avoir' : 'Supprimer' }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useFacturationStore, MODES_PAIEMENT } from '@/store/facturation.js'
import { usePatientStore } from '@/store/patients.js'
import { useAuthStore } from '@/store/auth.js'
import { useUIStore } from '@/store/ui.js'
import { generateFacturePDF } from '@/utils/facturePdf.js'

const facturationStore = useFacturationStore()
const patientStore     = usePatientStore()
const authStore        = useAuthStore()
const uiStore          = useUIStore()
const route            = useRoute()

// ── Filtres ──────────────────────────────────────────────────────────────────
const searchQ     = ref('')
const filterStatut = ref('')
const filterMode   = ref('')

const filteredFactures = computed(() => {
  return facturationStore.facturesSorted.filter(f => {
    if (filterStatut.value === 'brouillon' && f.numero) return false
    if (filterStatut.value === 'annulee' && !f.annuleeLe) return false
    if (filterStatut.value === 'avoir' && f.genre !== 'avoir') return false
    if (['paye', 'en_attente'].includes(filterStatut.value) && (f.statut !== filterStatut.value || !f.numero || f.annuleeLe || f.genre === 'avoir')) return false
    if (filterMode.value  && f.modePaiement !== filterMode.value) return false
    if (searchQ.value) {
      const q = searchQ.value.toLowerCase()
      const name = getPatientName(f.patientId, f).toLowerCase()
      if (!name.includes(q) && !String(f.numero || '').includes(q)) return false
    }
    return true
  })
})

// ── Helpers ──────────────────────────────────────────────────────────────────
function getPatientName(id, facture) {
  const p = patientStore.patients.find(p => p.id === id) || facture?.patientFige
  return p ? `${p.prenom} ${p.nom}` : '—'
}
function getModeLabel(val) {
  return MODES_PAIEMENT.find(m => m.value === val)?.label ?? val
}
function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function formatMoney(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0)
}

// ── Brouillon de facture ─────────────────────────────────────────────────────
const showFactureModal = ref(false)
const editingId        = ref(null)
const showActePicker   = ref(false)
const saving           = ref(false)

const editingFacture = computed(() => editingId.value ? facturationStore.getFacture(editingId.value) : null)
// Facture émise : contenu figé, seuls le paiement et la signature changent
const locked = computed(() => !!editingFacture.value?.numero)
const modalTitle = computed(() => {
  const f = editingFacture.value
  if (!f) return 'Nouvelle facture'
  if (f.numero) return `${f.genre === 'avoir' ? 'Avoir' : 'Facture'} n° ${f.numero}`
  return 'Brouillon de facture'
})

const SIG_OPTIONS = [
  { value: null,    icon: '🔧', label: 'Par défaut (profil)' },
  { value: 'image', icon: '🖼️', label: 'Image enregistrée' },
  { value: 'empty', icon: '✏️', label: 'Cases vides' },
  { value: 'none',  icon: '🚫', label: 'Aucune' },
]

const draft = reactive({
  patientId:       '',
  date:            new Date().toISOString().split('T')[0],
  actes:           [],
  total:           0,
  modePaiement:    'especes',
  statut:          'paye',
  notes:           '',
  signatureOption: null,  // null = use profile default
})

const calculatedTotal = computed(() =>
  draft.actes.reduce((sum, a) => sum + (Number(a.quantite) || 0) * (Number(a.prix) || 0), 0)
)

function recalcTotal() {
  draft.total = calculatedTotal.value
}

const isFormValid = computed(() => draft.patientId && draft.date)
const canEmit     = computed(() => isFormValid.value && draft.actes.length > 0)

function openNewFacture() {
  editingId.value = null
  Object.assign(draft, {
    patientId:       route.query.patientId || '',
    date:            new Date().toISOString().split('T')[0],
    actes:           [],
    total:           0,
    modePaiement:    'especes',
    statut:          'paye',
    notes:           '',
    signatureOption: null,
  })
  showActePicker.value = false
  showFactureModal.value = true
}

function openEditFacture(f) {
  editingId.value = f.id
  Object.assign(draft, {
    patientId:       f.patientId,
    date:            f.date,
    actes:           (f.actes || []).map(a => ({ ...a, _key: Math.random() })),
    total:           f.total,
    modePaiement:    f.modePaiement,
    statut:          f.statut,
    notes:           f.notes || '',
    signatureOption: f.signatureOption ?? null,
  })
  showActePicker.value = false
  showFactureModal.value = true
}

function closeModal() {
  showFactureModal.value = false
  editingId.value = null
  showActePicker.value = false
}

// ── Actes ────────────────────────────────────────────────────────────────────
function addActeFromType() {
  showActePicker.value = !showActePicker.value
}

function pickActeType(t) {
  draft.actes.push({ _key: Math.random(), label: t.label, quantite: 1, prix: t.prix })
  recalcTotal()
  showActePicker.value = false
}

function addBlankActe() {
  draft.actes.push({ _key: Math.random(), label: '', quantite: 1, prix: 0 })
  showActePicker.value = false
}

function removeActe(i) {
  draft.actes.splice(i, 1)
  recalcTotal()
}

// ── Sauvegarde ────────────────────────────────────────────────────────────────
function buildPayload() {
  return {
    patientId:       draft.patientId,
    date:            draft.date,
    actes:           draft.actes.map(({ _key, ...rest }) => rest),
    total:           draft.total,
    modePaiement:    draft.modePaiement,
    statut:          draft.statut,
    notes:           draft.notes,
    signatureOption: draft.signatureOption,
  }
}

async function saveFacture(emettre) {
  if (!locked.value && !isFormValid.value) return null
  saving.value = true
  try {
    let f
    if (locked.value) {
      f = await facturationStore.updateFacture(editingId.value, { statut: draft.statut, modePaiement: draft.modePaiement, signatureOption: draft.signatureOption })
      uiStore.success('Paiement enregistré')
    } else if (editingId.value) {
      f = await facturationStore.updateFacture(editingId.value, { ...buildPayload(), emettre })
      uiStore.success(emettre ? `Facture n° ${f.numero} émise` : 'Brouillon enregistré')
    } else {
      f = await facturationStore.createFacture({ ...buildPayload(), emettre })
      uiStore.success(emettre ? `Facture n° ${f.numero} émise` : 'Brouillon enregistré')
    }
    closeModal()
    if (emettre && f?.numero) envoiAutomatique(f)
    return f
  } catch (e) {
    uiStore.error(e.message || 'Enregistrement impossible')
    return null
  } finally {
    saving.value = false
  }
}

async function saveAndGeneratePDF() {
  if (!canEmit.value) return
  const f = await saveFacture(true)
  if (f) await generatePDF(f)
}

// ── PDF ────────────────────────────────────────────────────────────────────
async function generatePDF(facture) {
  if (!facture?.numero) { uiStore.warning('Émets la facture pour obtenir son PDF numéroté'); return }
  const patient = patientStore.patients.find(p => p.id === facture.patientId)
  const pro = authStore.currentUser
  try {
    await generateFacturePDF({ facture, patient, pro })
    uiStore.success('PDF généré avec succès')
  } catch (e) {
    uiStore.error('Erreur lors de la génération du PDF')
    console.error(e)
  }
}

// ── Pennylane ──────────────────────────────────────────────────────────────────
const showPennylane   = ref(false)
const jetonPennylane  = ref('')
const depuisPennylane = ref(new Date().toISOString().slice(0, 10))
const plOccupe        = ref(false)
const progression     = ref('')
const envoisEnCours   = reactive(new Set())
const INCERTAIN       = 'Réponse de Pennylane non reçue'

function ouvrirPennylane() {
  jetonPennylane.value = ''
  progression.value = ''
  facturationStore.fetchPennylane()
  showPennylane.value = true
}

async function connecter() {
  plOccupe.value = true
  try {
    const res = await facturationStore.reglerPennylane({ jeton: jetonPennylane.value.trim(), depuis: depuisPennylane.value })
    jetonPennylane.value = ''
    uiStore.success(`Pennylane connecté : ${res.entreprise}`)
  } catch (e) { uiStore.error(e.message) } finally { plOccupe.value = false }
}

async function regler(data) {
  try { await facturationStore.reglerPennylane(data) } catch (e) { uiStore.error(e.message) }
}

async function deconnecter() {
  if (!confirm('Déconnecter Pennylane ? Ce qui y est déjà envoyé y reste.')) return
  plOccupe.value = true
  try { await facturationStore.deconnecterPennylane(); uiStore.success('Pennylane déconnecté') }
  catch (e) { uiStore.error(e.message) } finally { plOccupe.value = false }
}

async function synchroClients() {
  plOccupe.value = true
  try {
    const n = await facturationStore.synchroClientsPennylane()
    uiStore.success(n ? `${n} client(s) mis à jour dans Pennylane` : 'Les clients Pennylane sont à jour')
  } catch (e) { uiStore.error(e.message) } finally { plOccupe.value = false }
}

/** Fabrique le PDF de la facture (le même que celui qu'on télécharge) et l'envoie. */
async function envoyer(f, forcer = false) {
  const patient = patientStore.patients.find(p => p.id === f.patientId)
  const pdf = await generateFacturePDF({ facture: f, patient, pro: authStore.currentUser, sortie: 'base64' })
  return facturationStore.envoyerPennylane(f, pdf, forcer)
}

/** Après une réponse perdue, on ne renvoie qu'avec l'accord du podologue (Pennylane accepterait un doublon). */
function forcerApresIncertain(f) {
  if (!String(f.pennylaneErreur || '').startsWith(INCERTAIN)) return false
  return confirm(`Le dernier envoi de ${f.numero} n'a pas eu de réponse de Pennylane.\n\nVérifie dans Pennylane qu'elle n'y est pas déjà. L'envoyer quand même ?`) ? true : null
}

async function envoyerUne(f) {
  const forcer = forcerApresIncertain(f)
  if (forcer === null) return
  envoisEnCours.add(f.id)
  try {
    await envoyer(f, forcer)
    uiStore.success(`${f.genre === 'avoir' ? 'Avoir' : 'Facture'} ${f.numero} envoyé(e) à Pennylane`)
  } catch (e) { uiStore.error(e.message) } finally { envoisEnCours.delete(f.id) }
}

async function toutEnvoyer() {
  const liste = facturationStore.facturesPourPennylane.filter(f => !String(f.pennylaneErreur || '').startsWith(INCERTAIN))
  plOccupe.value = true
  let ok = 0, ko = 0
  for (const [i, f] of liste.entries()) {
    progression.value = `Envoi ${i + 1} / ${liste.length}…`
    try { await envoyer(f); ok++ } catch (e) { ko++; console.error(f.numero, e.message) }
  }
  progression.value = ''
  plOccupe.value = false
  const restant = facturationStore.facturesPourPennylane.length
  if (ko || restant) uiStore.warning(`${ok} envoyée(s). ${restant} restent à envoyer : survole « Pennylane ! » dans la liste pour voir pourquoi.`)
  else uiStore.success(`${ok} facture(s) envoyée(s) à Pennylane`)
}

/** Envoi en arrière-plan juste après l'émission, si le podologue l'a choisi. */
async function envoiAutomatique(f) {
  const pl = facturationStore.pennylane
  if (!pl.connecte || !pl.envoiAuto || (pl.depuis && f.date < pl.depuis)) return
  try { await envoyer(f); uiStore.success(`${f.numero} envoyée à Pennylane`) }
  catch (e) { uiStore.warning(`${f.numero} non envoyée à Pennylane : ${e.message}`) }
}

// ── Rappels ───────────────────────────────────────────────────────────────────
const showRappelSettings = ref(false)

async function markReminded(id) {
  try {
    await facturationStore.markReminded(id)
    uiStore.success('Rappel marqué comme envoyé')
  } catch (e) { uiStore.error(e.message) }
}

// ── Suppression ──────────────────────────────────────────────────────────────
const factureToDelete = ref(null)
const showActeTypesModal = ref(false)

const motifAvoir = ref('')

function askDelete(f) { motifAvoir.value = ''; factureToDelete.value = f }
async function doDelete() {
  const f = factureToDelete.value
  saving.value = true
  try {
    if (f.numero) {
      const avoir = await facturationStore.annulerFacture(f.id, motifAvoir.value)
      uiStore.success(`Facture ${f.numero} annulée par l’avoir ${avoir.numero}`)
      if (f.pennylaneId) envoiAutomatique(avoir)
    } else {
      await facturationStore.deleteFacture(f.id)
      uiStore.success('Brouillon supprimé')
    }
    factureToDelete.value = null
  } catch (e) {
    uiStore.error(e.message)
  } finally {
    saving.value = false
  }
}

// ── Ouverture depuis PatientDetail (query param) ─────────────────────────────
// Les factures arrivent du serveur : on attend qu'elles soient là pour ouvrir celle demandée (une seule fois)
let ouvertePour = null
watch([() => route.query.editId, () => facturationStore.factures.length], ([id]) => {
  if (route.name !== 'Facturation' || !id || ouvertePour === id) return
  const f = facturationStore.getFacture(String(id))
  if (f) { ouvertePour = id; openEditFacture(f) }
}, { immediate: true })
watch(() => route.query.patientId, (pid) => {
  if (route.name === 'Facturation' && pid && !route.query.editId) openNewFacture()
}, { immediate: true })
</script>

<style scoped>
.facturation { max-width: 1200px; margin: 0 auto; }

.page-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  flex-wrap: wrap; gap: var(--space-md); margin-bottom: var(--space-xl);
}
.page-title { font-size: var(--text-2xl); font-weight: 800; color: var(--color-text); }
.page-sub   { font-size: var(--text-sm); color: var(--color-text-muted); margin-top: 4px; }
.header-actions { display: flex; gap: var(--space-sm); flex-wrap: wrap; }

/* Filtres */
.filters-bar { display: flex; gap: var(--space-md); flex-wrap: wrap; padding: var(--space-md); margin-bottom: var(--space-md); }
.filter-input  { min-width: 200px; flex: 1; }
.filter-select { min-width: 160px; }

/* Table */
.factures-table { width: 100%; border-collapse: collapse; }
.factures-table th {
  text-align: left; padding: 10px 12px;
  font-size: var(--text-xs); font-weight: 700; text-transform: uppercase;
  letter-spacing: .05em; color: var(--color-text-muted);
  border-bottom: 2px solid var(--color-border);
}
.table-row { cursor: pointer; transition: background var(--transition-fast); }
.table-row:hover { background: var(--color-primary-light); }
.factures-table td { padding: 12px 12px; font-size: var(--text-sm); border-bottom: 1px solid var(--color-border); vertical-align: middle; }

.td-date   { white-space: nowrap; font-weight: 600; color: var(--color-text); }
.td-patient{ font-weight: 600; }
.td-actes  { color: var(--color-text-muted); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.td-amount { font-weight: 700; color: var(--color-text); white-space: nowrap; }
.td-actions{ display: flex; gap: 4px; }

.mode-chip {
  display: inline-block; padding: 2px 10px; border-radius: var(--radius-full);
  font-size: var(--text-xs); font-weight: 600;
  background: var(--color-surface-alt); border: 1px solid var(--color-border);
  color: var(--color-text-muted);
}
.statut-badge {
  display: inline-block; padding: 3px 10px; border-radius: var(--radius-full);
  font-size: var(--text-xs); font-weight: 700;
}
.statut-paye    { background: #dcfce7; color: #15803d; }
.statut-brouillon { background: #e2e8f0; color: #475569; }
.statut-annulee { background: #fee2e2; color: #b91c1c; }
.statut-avoir   { background: #ede9fe; color: #6d28d9; }
.td-numero { white-space: nowrap; }
.numero { font-family: ui-monospace, monospace; font-weight: 700; font-size: var(--text-xs); }
.lock-banner { background: #fef9c3; border: 1px solid #fde047; color: #713f12; border-radius: var(--radius-md, 8px); padding: 10px 12px; font-size: var(--text-sm); margin-bottom: var(--space-md); line-height: 1.5; }
.total-value { font-size: var(--text-lg, 1.1rem); }
.statut-attente { background: #fef3c7; color: #92400e; }
.pl-chip { display: inline-block; margin-left: 6px; padding: 2px 8px; border-radius: var(--radius-full); font-size: 10px; font-weight: 700; white-space: nowrap; }
.pl-ok { background: #e0f2fe; color: #0369a1; }
.pl-ko { background: #fee2e2; color: #b91c1c; cursor: help; }
.pl-body { display: flex; flex-direction: column; gap: var(--space-md); }
.pl-body p { margin: 0; line-height: 1.5; }
.pl-etapes { margin: 0; padding-left: 20px; line-height: 1.7; font-size: var(--text-sm); }
.pl-a-envoyer { font-size: var(--text-sm); color: var(--color-text-muted); display: flex; flex-direction: column; gap: 4px; }
.pl-progression { font-weight: 700; color: var(--color-text); }

.empty-state {
  text-align: center; padding: var(--space-2xl);
  color: var(--color-text-muted); display: flex; flex-direction: column; align-items: center;
}

/* Modal */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 9990;
  display: flex; align-items: center; justify-content: center; padding: var(--space-md);
}
.modal {
  background: var(--color-surface); border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl); width: 100%; max-height: 90dvh; overflow-y: auto;
}
.modal-sm  { max-width: 420px; padding: var(--space-xl); }
.modal-lg  { max-width: 780px; }
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-xl) var(--space-xl) var(--space-md);
  border-bottom: 1px solid var(--color-border);
}
.modal-title { font-size: var(--text-xl); font-weight: 700; }
.modal-body  { padding: var(--space-xl); display: flex; flex-direction: column; gap: var(--space-lg); }
.modal-footer {
  display: flex; justify-content: flex-end; gap: var(--space-sm); flex-wrap: wrap;
  padding: var(--space-md) var(--space-xl) var(--space-xl);
  border-top: 1px solid var(--color-border);
}
.modal-sm h3 { font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-md); }
.modal-sm p  { color: var(--color-text-muted); line-height: 1.6; }
.modal-actions { display: flex; justify-content: flex-end; gap: var(--space-sm); margin-top: var(--space-xl); }

/* Form rows */
.form-row-3 { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: var(--space-md); }
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); }

/* Actes */
.actes-section { display: flex; flex-direction: column; gap: var(--space-sm); }
.actes-header  { display: flex; align-items: center; justify-content: space-between; }
.section-label { font-size: var(--text-sm); font-weight: 700; color: var(--color-text); }

.acte-picker {
  background: var(--color-surface-alt); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); overflow: hidden;
}
.acte-picker-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; font-size: var(--text-sm); cursor: pointer;
  transition: background var(--transition-fast);
}
.acte-picker-item:hover { background: var(--color-primary-light); color: var(--color-primary); }
.acte-picker-item + .acte-picker-item { border-top: 1px solid var(--color-border); }
.acte-picker-item--custom { color: var(--color-primary); font-weight: 600; }
.acte-picker-price { font-weight: 700; font-size: var(--text-xs); color: var(--color-text-muted); }

.actes-list { display: flex; flex-direction: column; gap: 8px; }
.acte-row {
  display: grid; grid-template-columns: 1fr 80px 100px 90px 32px;
  gap: 8px; align-items: end;
}
.acte-label { }
.acte-sub-label { font-size: var(--text-xs); font-weight: 600; color: var(--color-text-muted); display: block; margin-bottom: 4px; }
.acte-qty   { text-align: center; }
.acte-price { }
.acte-line-total {
  font-weight: 700; font-size: var(--text-sm); color: var(--color-primary);
  white-space: nowrap; padding-bottom: 10px;
}
.acte-del { align-self: end; margin-bottom: 2px; }

.actes-empty { color: var(--color-text-light); font-size: var(--text-sm); text-align: center; padding: var(--space-md); }

.total-row {
  display: flex; align-items: center; gap: var(--space-md);
  padding: var(--space-md); background: var(--color-primary-light);
  border-radius: var(--radius-md); margin-top: var(--space-sm);
}
.total-input  { max-width: 120px; font-weight: 700; font-size: var(--text-lg); }
.total-calc-hint { font-size: var(--text-xs); color: var(--color-text-muted); }

/* Acte types modal */
.acte-types-list { display: flex; flex-direction: column; gap: 8px; }
.acte-type-row   { display: flex; gap: 8px; align-items: center; }
.acte-type-price { max-width: 100px; }

/* Rappel badge */
.rappel-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: var(--radius-full); background: #f97316; color: white;
  font-size: 10px; font-weight: 800; margin-left: 4px;
}

/* Bannière rappels */
.rappel-banner {
  background: #fff7ed; border: 1.5px solid #fed7aa;
  border-radius: var(--radius-lg); padding: var(--space-md) var(--space-lg);
  margin-bottom: var(--space-md); display: flex; flex-direction: column; gap: 10px;
}
.rappel-banner-title {
  display: flex; align-items: center; gap: 8px;
  font-weight: 700; font-size: var(--text-sm); color: #c2410c;
}
.rappel-list { display: flex; flex-direction: column; gap: 6px; }
.rappel-item {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;
  gap: 8px; padding: 8px 12px; background: white;
  border-radius: var(--radius-md); border: 1px solid #fed7aa;
}
.rappel-info { font-size: var(--text-sm); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.rappel-actions { display: flex; gap: 6px; }
.btn-warning {
  background: #f97316; color: white; border: none;
  padding: 5px 12px; border-radius: var(--radius-md);
  font-size: var(--text-xs); font-weight: 700; cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-warning:hover { background: #ea6c0a; }

/* Statut toggle dans le formulaire */
.statut-toggle { display: flex; gap: 6px; }
.statut-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 8px 10px; border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border); background: var(--color-surface-alt);
  font-size: var(--text-sm); font-weight: 600; cursor: pointer;
  transition: all var(--transition-fast); color: var(--color-text-muted);
}
.statut-btn--paye.active   { background: #dcfce7; border-color: #16a34a; color: #15803d; }
.statut-btn--attente.active { background: #fff7ed; border-color: #f97316; color: #c2410c; }
.statut-btn:not(.active):hover { border-color: var(--color-primary); color: var(--color-primary); }

/* Rappel settings modal */
.rappel-toggle-row {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding: 10px 14px; background: var(--color-surface-alt);
  border-radius: var(--radius-md); border: 1px solid var(--color-border);
  cursor: pointer;
}
.toggle-switch {
  width: 42px; height: 24px; border-radius: 12px;
  background: var(--color-border); cursor: pointer;
  position: relative; transition: background 200ms; flex-shrink: 0;
}
.toggle-switch.on { background: var(--color-primary); }
.toggle-knob {
  position: absolute; top: 3px; left: 3px;
  width: 18px; height: 18px; border-radius: 50%; background: white;
  transition: left 200ms; box-shadow: 0 1px 3px rgba(0,0,0,.2);
}
.toggle-switch.on .toggle-knob { left: 21px; }
.days-input-row { display: flex; align-items: center; gap: 10px; }
.days-input { max-width: 80px; }
.days-label { font-size: var(--text-sm); color: var(--color-text-muted); }
.rappel-info-box {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 14px; background: #eff6ff; border-radius: var(--radius-md);
  border: 1px solid #bfdbfe; font-size: var(--text-xs); color: #1e40af; line-height: 1.5;
}

/* Signature pick */
.sig-pick-row {
  display: flex; gap: 6px; flex-wrap: wrap;
}
.sig-pick-btn {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 12px; border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border); background: var(--color-surface-alt);
  font-size: var(--text-xs); font-weight: 600; cursor: pointer;
  color: var(--color-text-muted); transition: all var(--transition-fast);
}
.sig-pick-btn.active { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-light); }
.sig-pick-btn:hover:not(.active) { border-color: var(--color-primary); color: var(--color-primary); }
.sig-pick-icon { font-size: 14px; }
.sig-pick-label { white-space: nowrap; }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 180ms; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }

@media (max-width: 768px) {
  /* Page header empilé */
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; justify-content: flex-start; }

  .form-row-3 { grid-template-columns: 1fr; }
  .form-row-2 { grid-template-columns: 1fr; }
  .acte-row   { grid-template-columns: 1fr 60px 80px 70px 28px; }
  .filters-bar { flex-direction: column; }

  /* Table factures scrollable */
  .table-card { padding: 0; overflow: hidden; }
  .factures-table { display: block; overflow-x: auto; -webkit-overflow-scrolling: touch; min-width: 480px; }

  /* Bannière rappels */
  .rappel-item { flex-direction: column; align-items: flex-start; }
  .rappel-actions { width: 100%; justify-content: flex-end; display: flex; }

  /* Statut toggle */
  .statut-toggle { flex-direction: row; }
}

@media (max-width: 480px) {
  /* Cacher colonnes secondaires table */
  .factures-table .td-actes,
  .factures-table th:nth-child(3) { display: none; }

  .acte-row { grid-template-columns: 1fr 50px 70px 60px 24px; gap: 4px; }
  .header-actions { flex-direction: column; gap: 8px; }
  .header-actions .btn { width: 100%; justify-content: center; }
}
</style>
