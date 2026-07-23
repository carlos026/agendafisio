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

// Converte texto de data para YYYY-MM-DD.
// Aceita tanto "YYYY-MM-DD" (ISO) quanto "DD/MM/YYYY" (formato usado
// na própria exportação do sistema, via isoToDisplay). Retorna null se
// não reconhecer o formato.
export function parseDateString(val) {
  if (!val) return null
  const str = val.toString().trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10)
  const brMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) {
    const [, d, m, y] = brMatch
    return `${y}-${m}-${d}`
  }
  return null
}

// Mapeia texto de status do Excel para código interno do sistema
export function parseStatus(val) {
  if (!val) return 'scheduled'
  const v = val.toString().toLowerCase().trim()
  if (v === 'concluído' || v === 'concluido') return 'completed'
  if (v === 'cancelado') return 'cancelled'
  return 'scheduled'
}

// Determina tipo de convênio a partir da coluna "Acesso" (formato legado)
// ou "Convênio" (formato da própria exportação do sistema)
// Ex: "Convênio (Amil)" → "convenio", "Particular" → "particular"
export function parseConvenio(val) {
  if (!val) return ''
  const v = val.toString().toLowerCase().trim()
  if (v === 'particular') return 'particular'
  if (v === 'convênio' || v === 'convenio') return 'convenio'
  if (v === 'não informado' || v === 'nao informado') return ''
  if (v.includes('particular')) return 'particular'
  if (v.includes('conv') || v.includes('amil') || v.includes('unimed')) return 'convenio'
  return ''
}

// Tenta extrair número da sessão da descrição (formato legado)
// Ex: "Atendimento 1" → 1, "Atendimento 12" → 12, outros → null
export function parseSessionNumber(description) {
  if (!description) return null
  const match = description.toString().match(/atendimento\s+(\d+)/i)
  if (match) return parseInt(match[1], 10)
  return null
}

// Converte valor genérico para inteiro, ou null se não for um número válido
// Usado para "Sessão", "Sessões (Guia)" e "Total de Sessões"
export function parseIntOrNull(val) {
  if (val === null || val === undefined || val === '') return null
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

// Mantido por compatibilidade — equivalente a parseIntOrNull
export function parseTotalSessions(val) {
  return parseIntOrNull(val)
}

// Interpreta valor de pagamento tanto no formato legado (booleano/1)
// quanto no formato da própria exportação ("Sim"/"Não")
export function parsePaid(val) {
  if (val === true || val === 1) return true
  if (typeof val === 'string') {
    const v = val.trim().toLowerCase()
    return v === 'sim' || v === 'yes' || v === 'true' || v === '1'
  }
  return false
}

// Mapeia texto de "Tipo de Consulta" para o código interno appointmentType
export function parseAppointmentType(val) {
  if (!val) return 'sessao'
  const v = val.toString().toLowerCase().trim()
  return v.startsWith('avalia') ? 'avaliacao' : 'sessao'
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

// Mapeia appointmentType interno para texto legível
export function appointmentTypeToLabel(appointmentType) {
  return appointmentType === 'avaliacao' ? 'Avaliação' : 'Sessão'
}

// Mapeia flag de paciente ativo/inativo para texto legível
export function activeToLabel(active) {
  return active !== false ? 'Ativo' : 'Desistiu'
}

// Formata data YYYY-MM-DD para DD/MM/YYYY (exibição)
export function isoToDisplay(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}
