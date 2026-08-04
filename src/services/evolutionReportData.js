// ===== Modelagem de dados do Relatório de Evolução (PDF) =====
// Sem dependência de jsPDF — apenas leitura/formatação dos dados de
// paciente, agendamentos e evoluções para consumo pelo template do PDF.

import { formatDate, calculateAge } from '../utils/helpers'

const NAO_INFORMADO = 'Não informado'

function isEmptyField(v) {
  return !v || !v.trim() || v.trim() === '-'
}

// ---- Formatação de sinais vitais ----
// Regra: sentinela vazio/"-" vira "Não informado"; valor que já contém a
// unidade é impresso como digitado; número simples ganha o sufixo
// canônico; texto livre não reconhecido é impresso como digitado.

export function formatPA(raw) {
  if (isEmptyField(raw)) return NAO_INFORMADO
  const v = raw.trim()
  const m = v.match(/^(\d{2,3})\s*[\/xX]\s*(\d{2,3})/)
  if (!m) return v
  return /mmhg/i.test(v) ? v : `${m[1]}x${m[2]} mmHg`
}

export function formatSat(raw) {
  if (isEmptyField(raw)) return NAO_INFORMADO
  const v = raw.trim()
  const m = v.match(/^(\d{1,3})/)
  if (!m) return v
  return /%|spo2/i.test(v) ? v : `${m[1]} %SpO2`
}

export function formatFc(raw) {
  if (isEmptyField(raw)) return NAO_INFORMADO
  const v = raw.trim()
  const m = v.match(/^(\d{1,3})/)
  if (!m) return v
  return /bpm/i.test(v) ? v : `${m[1]} bpm`
}

// ---- Data da Avaliação ----
// Primeira (mais antiga) consulta do tipo "avaliação" do paciente.
function findAvaliacaoDate(appointments, patientId) {
  const avaliacoes = appointments
    .filter(a => a.patientId === patientId && (a.appointmentType === 'avaliacao' || a.notes === 'Avaliação'))
    .sort((a, b) => a.date.localeCompare(b.date))
  return avaliacoes[0]?.date || null
}

// ---- Monta os dados prontos para o template do PDF ----
export function buildEvolutionReportData({ patientId, patients, appointments, carimboText }) {
  const patient = patients.find(p => p.id === patientId)
  if (!patient) throw new Error('Paciente não encontrado')

  const age = calculateAge(patient.birthDate)
  const avaliacaoDate = findAvaliacaoDate(appointments, patientId)

  const evolutionAppointments = appointments
    .filter(a => a.patientId === patientId && a.evolution)
    .sort((a, b) => (a.evolution.data || a.date).localeCompare(b.evolution.data || b.date))

  const evolutions = evolutionAppointments.map(apt => {
    const e = apt.evolution
    return {
      dateLabel: formatDate(e.data || apt.date),
      sessionLabel: `${apt.sessionNumber ?? '—'} / ${apt.totalSessions ?? '—'}`,
      paInicial: formatPA(e.paInicial),
      paFinal: formatPA(e.paFinal),
      satInicial: formatSat(e.satInicial),
      satFinal: formatSat(e.satFinal),
      fcInicial: formatFc(e.fcInicial),
      fcFinal: formatFc(e.fcFinal),
      texto: e.texto || '',
    }
  })

  return {
    patient: {
      name: patient.name,
      ageLabel: age === null ? '' : `${age} anos`,
      birthDateLabel: patient.birthDate ? formatDate(patient.birthDate) : '',
      mainComplaintLabel: patient.mainComplaint?.trim() || '',
      avaliacaoDateLabel: avaliacaoDate ? formatDate(avaliacaoDate) : '',
    },
    evolutions,
    carimboText: carimboText?.trim() || '',
  }
}
