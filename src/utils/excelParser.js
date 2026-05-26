// ===== Utilitários de conversão de dados do Excel =====

// Converte número serial do Excel para YYYY-MM-DD
// Excel conta dias desde 1899-12-30 (com bug de ano bissexto em 1900)
export function excelDateToISO(serial) {
  const date = new Date((serial - 25569) * 86400 * 1000)
  return date.toISOString().split('T')[0]
}

// Converte fração decimal do Excel (0..1) para string "HH:MM"
// Ex: 0.4166... (10h) → "10:00", 0.5833... (14h) → "14:00"
export function excelTimeToHHMM(decimal) {
  const totalMinutes = Math.round(decimal * 24 * 60)
  const hours = Math.floor(totalMinutes / 60) % 24
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

// Mapeia texto de status do Excel para código interno do sistema
export function parseStatus(val) {
  if (!val) return 'scheduled'
  const v = val.toString().toLowerCase().trim()
  if (v === 'concluído' || v === 'concluido') return 'completed'
  if (v === 'cancelado') return 'cancelled'
  return 'scheduled'
}

// Determina tipo de convênio a partir da coluna "Acesso"
// Ex: "Convênio (Amil)" → "convenio", "Particular" → "particular"
export function parseConvenio(val) {
  if (!val) return ''
  const v = val.toString().toLowerCase()
  if (v.includes('particular')) return 'particular'
  if (v.includes('conv') || v.includes('amil') || v.includes('unimed')) return 'convenio'
  return ''
}

// Tenta extrair número da sessão da descrição
// Ex: "Atendimento 1" → 1, "Atendimento 12" → 12, outros → null
export function parseSessionNumber(description) {
  if (!description) return null
  const match = description.toString().match(/atendimento\s+(\d+)/i)
  if (match) return parseInt(match[1], 10)
  return null
}

// Tenta converter "Sessões (Guia)" para inteiro
// Ex: "20" → 20, "Indefinido" → null, null → null
export function parseTotalSessions(val) {
  if (!val) return null
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

// Mapeia código de status interno para texto em português
export function statusToLabel(status) {
  const map = { scheduled: 'Agendado', completed: 'Concluído', cancelled: 'Cancelado' }
  return map[status] || status
}

// Mapeia código de convênio para texto legível
export function convenioToLabel(convenio) {
  const map = { convenio: 'Convênio', particular: 'Particular', '': 'Não informado' }
  return map[convenio] ?? convenio
}

// Formata data YYYY-MM-DD para DD/MM/YYYY (exibição)
export function isoToDisplay(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
