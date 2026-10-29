import { jsPDF } from 'jspdf'

/**
 * Génère et télécharge une facture PDF – design minimaliste
 * @param {{ facture, patient, pro, sortie }} opts  sortie = 'base64' : renvoie le PDF (envoi à Pennylane) au lieu de le télécharger
 */
export async function generateFacturePDF({ facture, patient, pro, sortie }) {
  const doc    = new jsPDF({ unit: 'mm', format: 'a4' })
  const W      = 210
  const H      = 297
  const M      = 18          // margin
  const INNER  = W - M * 2

  // ── Palette épurée ──────────────────────────────────────────────────────────
  const INK     = [20, 30, 48]        // quasi-noir
  const MUTED   = [100, 116, 139]     // gris moyen
  const LIGHT   = [248, 250, 252]     // fond très clair
  const LINE    = [226, 232, 240]     // séparateur
  const ACCENT  = [43, 108, 176]      // bleu discret
  const WHITE   = [255, 255, 255]

  // ── Helpers ────────────────────────────────────────────────────────────────
  const rgb  = (...c) => doc.setTextColor(...c)
  const fill = (...c) => doc.setFillColor(...c)
  const drw  = (...c) => doc.setDrawColor(...c)

  function font(size, weight = 'normal', color = INK) {
    doc.setFontSize(size); doc.setFont('helvetica', weight); rgb(...color)
  }

  function hline(y, color = LINE, lw = 0.25) {
    drw(...color); doc.setLineWidth(lw); doc.line(M, y, M + INNER, y)
  }

  function money(n) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0)
  }

  function fmtDate(d) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  }

  // ── Numéro de facture ──────────────────────────────────────────────────────
  // Numéro continu attribué par le serveur à l'émission (un brouillon n'a pas de PDF)
  const numFact = `N° ${facture.numero || 'BROUILLON'}`
  const titre   = facture.genre === 'avoir' ? 'AVOIR' : 'FACTURE'
  // Patient : tel qu'au moment de l'émission (la fiche peut avoir changé ou été supprimée depuis)
  if (facture.patientFige) patient = { ...(patient || {}), ...facture.patientFige }

  // ═══════════════════════════════════════════════════════════════════════════
  // EN-TÊTE : bande fine + titre
  // ═══════════════════════════════════════════════════════════════════════════
  // Bande colorée fine en haut
  fill(...ACCENT)
  doc.rect(0, 0, W, 3, 'F')

  let y = 18

  // Nom du praticien / cabinet à gauche — mot "FACTURE" à droite
  const proName = `${pro?.prenom || ''} ${pro?.nom || ''}`.trim() || 'Praticien'
  font(13, 'bold', INK)
  doc.text(proName, M, y)
  if (pro?.cabinet) {
    font(8.5, 'normal', MUTED)
    doc.text(pro.cabinet, M, y + 5.5)
  }

  font(20, 'bold', ACCENT)
  doc.text(titre, M + INNER, y, { align: 'right' })
  font(8, 'normal', MUTED)
  doc.text(numFact, M + INNER, y + 7, { align: 'right' })
  doc.text(`Date : ${fmtDate(facture.date)}`, M + INNER, y + 13, { align: 'right' })

  y += pro?.cabinet ? 26 : 20
  hline(y)
  y += 8

  // ═══════════════════════════════════════════════════════════════════════════
  // BLOCS INFO — Praticien | Patient
  // ═══════════════════════════════════════════════════════════════════════════
  const colW = (INNER - 10) / 2
  const col2 = M + colW + 10

  // Construire les lignes
  const proLines = [
    pro?.proAdresse   ? pro.proAdresse                         : null,
    pro?.proTelephone ? `Tél : ${pro.proTelephone}`            : null,
    (pro?.proEmail || pro?.email) ? `${pro.proEmail || pro.email}` : null,
    pro?.proSiret     ? `SIRET : ${pro.proSiret}`              : null,
  ].filter(Boolean)

  const patLines = [
    patient ? `${patient.prenom} ${patient.nom}` : '—',
    patient?.dateNaissance ? `Né(e) le ${fmtDate(patient.dateNaissance)}` : null,
    patient?.telephone     ? `Tél : ${patient.telephone}` : null,
    patient?.email         ? patient.email : null,
    patient?.adresse       ? patient.adresse : null,
  ].filter(Boolean)

  const LH   = 5.2
  const maxH = Math.max(proLines.length, patLines.length) * LH + 14

  // Bloc praticien
  fill(...LIGHT); drw(...LINE); doc.setLineWidth(0.25)
  doc.roundedRect(M, y, colW, maxH, 3, 3, 'FD')
  font(7, 'bold', MUTED)
  doc.text('PRATICIEN', M + 6, y + 6)
  let ly = y + 12
  proLines.forEach(l => {
    font(8, 'normal', INK)
    const wrapped = doc.splitTextToSize(l, colW - 12)
    doc.text(wrapped, M + 6, ly)
    ly += wrapped.length * LH
  })

  // Bloc patient
  fill(...LIGHT); drw(...LINE); doc.setLineWidth(0.25)
  doc.roundedRect(col2, y, colW, maxH, 3, 3, 'FD')
  font(7, 'bold', MUTED)
  doc.text('PATIENT', col2 + 6, y + 6)
  let py = y + 12
  patLines.forEach(l => {
    font(8, 'normal', INK)
    const wrapped = doc.splitTextToSize(l, colW - 12)
    doc.text(wrapped, col2 + 6, py)
    py += wrapped.length * LH
  })

  y += maxH + 10

  // ═══════════════════════════════════════════════════════════════════════════
  // TABLEAU DES ACTES
  // ═══════════════════════════════════════════════════════════════════════════
  const COL = { label: M, qty: M + 102, pu: M + 122, total: M + 151 }
  const ROW_H = 8

  // En-tête tableau — fond léger
  fill(...LIGHT); drw(...LINE); doc.setLineWidth(0.25)
  doc.rect(M, y, INNER, 8.5, 'FD')
  font(7, 'bold', MUTED)
  doc.text('DÉSIGNATION', COL.label + 3, y + 5.8)
  doc.text('QTÉ',         COL.qty   + 3, y + 5.8)
  doc.text('PRIX UNIT.',  COL.pu    + 3, y + 5.8)
  doc.text('MONTANT',     COL.total + 3, y + 5.8)
  y += 8.5

  const actes = Array.isArray(facture.actes) ? facture.actes : []
  if (actes.length === 0) {
    font(8, 'normal', MUTED)
    doc.text('Aucun acte renseigné', COL.label + 3, y + 5.5)
    y += ROW_H
  } else {
    actes.forEach((acte, i) => {
      const bg = i % 2 === 0 ? WHITE : [249, 250, 252]
      const labelLines = doc.splitTextToSize(acte.label || '—', 96)
      const rowH = Math.max(ROW_H, labelLines.length * 5 + 3)
      fill(...bg); doc.rect(M, y, INNER, rowH, 'F')
      drw(...LINE); doc.setLineWidth(0.15); doc.line(M, y + rowH, M + INNER, y + rowH)

      font(8.5, 'normal', INK)
      doc.text(labelLines, COL.label + 3, y + 5.5)
      font(8.5, 'normal', MUTED)
      doc.text(String(acte.quantite ?? 1), COL.qty + 3, y + 5.5)
      doc.text(money(acte.prix), COL.pu + 3, y + 5.5)
      font(8.5, 'bold', INK)
      doc.text(money((acte.quantite ?? 1) * (acte.prix ?? 0)), COL.total + 3, y + 5.5)
      y += rowH
    })
  }

  hline(y, ACCENT, 0.4)
  y += 6

  // ═══════════════════════════════════════════════════════════════════════════
  // TOTAL
  // ═══════════════════════════════════════════════════════════════════════════
  const totW = 64
  const totX = M + INNER - totW

  if (actes.length > 1) {
    font(8, 'normal', MUTED)
    doc.text('Sous-total :', totX, y + 4)
    font(8, 'bold', INK)
    doc.text(money(facture.total), M + INNER, y + 4, { align: 'right' })
    y += 6
  }

  // Ligne total
  fill(...ACCENT); doc.roundedRect(totX - 4, y, totW + 4, 12, 2, 2, 'F')
  font(7.5, 'normal', WHITE)
  doc.text('TOTAL TTC', totX, y + 5)
  font(11, 'bold', WHITE)
  doc.text(money(facture.total), M + INNER, y + 9, { align: 'right' })
  y += 18

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE DE PAIEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  const modeMap = {
    cheque: 'Chèque', especes: 'Espèces', cb: 'Carte bancaire',
    virement: 'Virement', 'tiers-payant': 'Tiers payant', autre: 'Autre',
  }
  const modeLabel = modeMap[facture.modePaiement] || facture.modePaiement || '—'

  font(7, 'bold', MUTED)
  doc.text('MODE DE PAIEMENT', M, y + 4)
  font(8.5, 'normal', INK)
  doc.text(modeLabel, M + 40, y + 4)
  y += 10

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  if (facture.notes?.trim()) {
    hline(y, LINE)
    y += 5
    font(7, 'bold', MUTED)
    doc.text('NOTES', M, y)
    y += 5
    font(8, 'normal', MUTED)
    const noteLines = doc.splitTextToSize(facture.notes.trim(), INNER)
    doc.text(noteLines, M, y)
    y += noteLines.length * 4.5 + 6
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNATURE & TAMPON (selon préférence du praticien)
  // ═══════════════════════════════════════════════════════════════════════════
  // Per-invoice choice overrides profile default; null = use profile
  const sigOption = facture.signatureOption ?? pro?.signatureOption ?? 'empty'

  if (sigOption !== 'none') {
    const SIG_H    = 38
    const FOOTER_Y = H - 14
    const SIG_Y    = Math.max(y + 8, FOOTER_Y - SIG_H - 12)
    const halfW    = (INNER - 8) / 2

    // Bloc tampon (gauche)
    fill(...LIGHT); drw(...LINE); doc.setLineWidth(0.2)
    doc.roundedRect(M, SIG_Y, halfW, SIG_H, 3, 3, 'FD')
    font(6.5, 'bold', MUTED)
    doc.text('CACHET / TAMPON', M + 5, SIG_Y + 6)
    font(7.5, 'normal', MUTED)
    doc.text(`Fait le : ${fmtDate(facture.date)}`, M + 5, SIG_Y + 12)

    if (sigOption === 'image' && pro?.tamponnImage) {
      try {
        doc.addImage(pro.tamponnImage, 'PNG', M + 5, SIG_Y + 15, 30, 18, undefined, 'FAST')
      } catch {}
    } else {
      // Cadre pointillé vide
      drw(...LINE); doc.setLineWidth(0.3)
      doc.setLineDashPattern([1.5, 1.5], 0)
      doc.roundedRect(M + 5, SIG_Y + 15, halfW - 10, 18, 2, 2, 'S')
      doc.setLineDashPattern([], 0)
      if (sigOption === 'empty') {
        font(6.5, 'normal', [180, 195, 215])
        doc.text('Tampon du praticien', M + 5 + (halfW - 10) / 2, SIG_Y + 26, { align: 'center' })
      }
    }

    // Bloc signature (droite)
    const sig2X = M + halfW + 8
    fill(...LIGHT); drw(...LINE); doc.setLineWidth(0.2)
    doc.roundedRect(sig2X, SIG_Y, halfW, SIG_H, 3, 3, 'FD')
    font(6.5, 'bold', MUTED)
    doc.text('SIGNATURE DU PRATICIEN', sig2X + 5, SIG_Y + 6)

    if (sigOption === 'image' && pro?.signatureImage) {
      try {
        doc.addImage(pro.signatureImage, 'PNG', sig2X + 5, SIG_Y + 14, 40, 18, undefined, 'FAST')
      } catch {}
    } else if (sigOption === 'empty') {
      drw(...LINE); doc.setLineWidth(0.4)
      doc.line(sig2X + 5, SIG_Y + SIG_H - 8, sig2X + halfW - 5, SIG_Y + SIG_H - 8)
      font(6.5, 'normal', [180, 195, 215])
      doc.text('Signature', sig2X + halfW / 2, SIG_Y + SIG_H - 4, { align: 'center' })
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PIED DE PAGE
  // ═══════════════════════════════════════════════════════════════════════════
  const FOOTER_Y = H - 14
  fill(...LIGHT); doc.rect(0, FOOTER_Y, W, 14, 'F')
  hline(FOOTER_Y, LINE, 0.2)
  font(6.5, 'normal', MUTED)
  doc.text('Document généré par PodoLogiciel', M, FOOTER_Y + 8)
  doc.text(numFact, M + INNER, FOOTER_Y + 8, { align: 'right' })

  // ── Téléchargement ─────────────────────────────────────────────────────────
  if (sortie === 'base64') return doc.output('datauristring').split(',')[1]
  const fileName = `${facture.genre === 'avoir' ? 'Avoir' : 'Facture'}_${facture.numero || 'brouillon'}_${patient ? `${patient.nom}_${patient.prenom}_` : ''}${facture.date}.pdf`
  doc.save(fileName)
}
