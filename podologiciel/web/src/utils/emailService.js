/**
 * Envoi du bilan PDF par email — sans backend, sans compte, sans limite.
 *
 * Mode 1 — Web Share API (Chrome 86+, Edge, Safari) :
 *   Ouvre la boîte de partage native du système (Windows / macOS) avec le PDF
 *   déjà joint. L'utilisateur choisit Mail / Outlook → envoie directement.
 *   Rien sauvegardé sur le disque, aucun compte tiers nécessaire.
 *
 * Mode 2 — Fallback mailto + download (tous navigateurs) :
 *   Télécharge le PDF + ouvre le client mail natif avec les champs pré-remplis.
 */

/**
 * @param {object} opts
 * @param {string} opts.toEmail       - Email du patient
 * @param {string} opts.subject       - Objet
 * @param {string} opts.body          - Corps du message
 * @param {string} opts.pdfBase64Uri  - PDF en data URI (data:application/pdf;base64,…)
 * @param {string} opts.pdfFilename   - Nom du fichier
 * @returns {'share'|'mailto'} Mode utilisé
 */
export async function sendOrOpenEmail({ toEmail, subject, body, pdfBase64Uri, pdfFilename }) {
  // Convertir le data URI en Blob
  const base64 = pdfBase64Uri.replace(/^data:application\/pdf;base64,/, '')
  const bytes  = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const blob   = new Blob([bytes], { type: 'application/pdf' })
  const file   = new File([blob], pdfFilename, { type: 'application/pdf' })

  // Mode 1 : Web Share API avec fichier joint
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files:   [file],
      title:   subject,
      text:    body,
    })
    return 'share'
  }

  // Mode 2 : Fallback — téléchargement + mailto
  const a = document.createElement('a')
  a.href = pdfBase64Uri
  a.download = pdfFilename
  a.click()

  setTimeout(() => {
    window.location.href =
      `mailto:${encodeURIComponent(toEmail)}` +
      `?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(body)}`
  }, 400)

  return 'mailto'
}

/** Indique si le mode partage direct est disponible */
export function canShareDirect() {
  const dummyFile = new File([''], 'test.pdf', { type: 'application/pdf' })
  return !!(navigator.canShare && navigator.canShare({ files: [dummyFile] }))
}
