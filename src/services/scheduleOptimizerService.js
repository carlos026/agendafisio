// Horário de funcionamento e regras da clínica
const WORK_START  = 8 * 60     // 08:00 em minutos
const WORK_END    = 18 * 60    // 18:00 em minutos
const LUNCH_START = 12 * 60    // 12:00
const LUNCH_END   = 13 * 60    // 13:00
const SLOT_STEP   = 30         // gera candidatos a cada 30 min
const GAP         = 15         // gap mínimo entre atendimentos (minutos)
const APT_DUR     = 45         // duração assumida dos agendamentos existentes (minutos)

function toMin(timeStr) {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

function toTimeStr(min) {
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

function localAddDays(dateStr, n) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, mo - 1, d + n)
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, '0'),
    String(dt.getDate()).padStart(2, '0'),
  ].join('-')
}

function getTodayLocal() {
  const d = new Date()
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * Encontra os melhores horários disponíveis na agenda.
 *
 * @param {Array}  appointments  - lista completa de agendamentos do contexto
 * @param {object} opts
 * @param {number} opts.duration - duração desejada em minutos (padrão: 60)
 * @param {number} opts.days     - número de dias a analisar a partir de hoje (padrão: 7)
 * @param {number} opts.maxResults - máximo de sugestões retornadas (padrão: 10)
 * @returns {Array<{date, time, score, reason}>}
 */
export function findAvailableSlots(appointments, { duration = 60, days = 7, maxResults = 10 } = {}) {
  const today = getTodayLocal()
  const now   = new Date()
  const nowMin = now.getHours() * 60 + now.getMinutes()

  const results = []

  for (let di = 0; di < days; di++) {
    const date = localAddDays(today, di)

    // Agendamentos ativos do dia (ignora cancelados)
    const dayMins = appointments
      .filter(a => a.date === date && a.status !== 'cancelled')
      .map(a => toMin(a.time))
      .sort((a, b) => a - b)

    for (let start = WORK_START; start + duration <= WORK_END; start += SLOT_STEP) {
      const end = start + duration

      // Descarta horários já passados (apenas no dia de hoje, com margem de 15 min)
      if (date === today && start < nowMin + 15) continue

      // Descarta slots que se sobreponham ao almoço
      if (start < LUNCH_END && end > LUNCH_START) continue

      // Verifica conflito com agendamentos existentes
      // Um conflito existe se o gap mínimo não é respeitado em ambos os lados
      const conflict = dayMins.some(aptMin => {
        const aptEnd = aptMin + APT_DUR
        return start < aptEnd + GAP && aptMin < end + GAP
      })
      if (conflict) continue

      // ── Pontuação de adjacência (favorece encaixes que aproveitam lacunas) ──
      let score = 0
      let reason = 'Horário livre'

      // Existe atendimento terminando logo antes deste slot?
      const hasBefore = dayMins.some(aptMin => {
        const aptEnd = aptMin + APT_DUR
        return aptEnd + GAP <= start && start - aptEnd <= GAP + SLOT_STEP
      })

      // Existe atendimento começando logo depois deste slot?
      const hasAfter = dayMins.some(aptMin =>
        aptMin >= end + GAP && aptMin - end <= GAP + SLOT_STEP
      )

      if (hasBefore && hasAfter) {
        score += 3
        reason = 'Encaixa entre atendimentos'
      } else if (hasBefore) {
        score += 2
        reason = 'Sequência de atendimento'
      } else if (hasAfter) {
        score += 1
        reason = 'Antes de atendimento existente'
      }

      // Penalidade leve por dias mais distantes (prioriza o mais próximo)
      score -= di * 0.05

      results.push({ date, time: toTimeStr(start), score, reason })
    }
  }

  // Ordena: maior score primeiro, depois data/hora crescente
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.date !== b.date)   return a.date.localeCompare(b.date)
    return a.time.localeCompare(b.time)
  })

  return results.slice(0, maxResults)
}
