// ===== Serviço de Exportação para Excel (.xlsx) =====
// Gera um arquivo Excel com os dados atuais do sistema:
//   Aba "Atendimentos"      — todos os agendamentos com nome do paciente
//   Aba "Pacientes"         — cadastro completo de pacientes
//   Aba "Resumo Financeiro" — totais por mês (só se houver atendimentos)
//   Aba "Evoluções"         — evoluções clínicas registradas (só se houver alguma)

import * as XLSX from 'xlsx'
import {
  statusToLabel,
  convenioToLabel,
  appointmentTypeToLabel,
  activeToLabel,
  isoToDisplay,
} from '../utils/excelParser'
import { calculateAge } from '../utils/helpers'
import * as patientService from './patientService'
import * as appointmentService from './appointmentService'

// ---- buildAppointmentsSheet ----
// Retorna array de objetos prontos para sheet_from_json.
// Colunas seguem o formato da planilha original.
function buildAppointmentsSheet(appointments, patients) {
  const patientMap = {}
  patients.forEach(p => { patientMap[p.id] = p })

  return appointments
    .slice() // não mutate o array original
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .map(apt => {
      const patient = patientMap[apt.patientId] || {}
      return {
        'Paciente':             patient.name || 'Removido',
        'Data do Atendimento':  isoToDisplay(apt.date),
        'Horário':              apt.time || '',
        'Status':               statusToLabel(apt.status),
        'Tipo de Atendimento':  apt.serviceType || '',
        'Tipo de Consulta':     appointmentTypeToLabel(apt.appointmentType),
        'Sessão':               apt.sessionNumber ?? '',
        'Total de Sessões':     apt.totalSessions ?? '',
        'Convênio':             convenioToLabel(patient.convenio || ''),
        'Valor (R$)':           apt.value ?? 0,
        'Pago':                 apt.paid ? 'Sim' : 'Não',
        'Não Iniciou Sessões':  apt.naoIniciouSessoes ? 'Sim' : 'Não',
        'Observações':          apt.notes || '',
      }
    })
}

// ---- buildPatientsSheet ----
function buildPatientsSheet(patients) {
  return patients.map(p => {
    const age = calculateAge(p.birthDate)
    return {
      'Nome':                p.name,
      'Data de Nascimento':  p.birthDate ? isoToDisplay(p.birthDate) : '',
      'Idade':               age === null ? '' : `${age} anos`,
      'Queixa Principal':    p.mainComplaint || '',
      'Telefone':            p.phone || '',
      'Convênio':            convenioToLabel(p.convenio || ''),
      'Situação':            activeToLabel(p.active),
      'Observações':         p.notes || '',
      'Cadastrado em':       p.createdAt ? isoToDisplay(p.createdAt.split('T')[0]) : '',
    }
  })
}

// ---- buildEvolutionsSheet ----
// Uma linha por evolução clínica registrada (appointment.evolution).
// "Data do Atendimento" + "Horário" identificam o atendimento exato ao qual
// a evolução pertence (mesmas colunas/formato da aba Atendimentos) — é o que
// permite religar a evolução ao atendimento certo ao reimportar. "Data da
// Evolução" é o campo clínico (pode ter sido editado e diferir da data do
// atendimento).
function buildEvolutionsSheet(appointments, patients) {
  const patientMap = {}
  patients.forEach(p => { patientMap[p.id] = p })

  return appointments
    .filter(apt => apt.evolution)
    .slice()
    .sort((a, b) => (a.evolution.data || a.date).localeCompare(b.evolution.data || b.date))
    .map(apt => {
      const patient = patientMap[apt.patientId] || {}
      const e = apt.evolution
      return {
        'Paciente':             patient.name || 'Removido',
        'Data do Atendimento':  isoToDisplay(apt.date),
        'Horário':              apt.time || '',
        'Data da Evolução':     isoToDisplay(e.data || apt.date),
        'PA Inicial':           e.paInicial || '',
        'PA Final':             e.paFinal || '',
        'Saturação Inicial':    e.satInicial || '',
        'Saturação Final':      e.satFinal || '',
        'FC Inicial':           e.fcInicial || '',
        'FC Final':             e.fcFinal || '',
        'Evolução':             e.texto || '',
      }
    })
}

// ---- buildSummarySheet ----
// Aba de resumo financeiro por mês
function buildSummarySheet(appointments) {
  const byMonth = {}

  appointments.forEach(apt => {
    if (!apt.date) return
    const monthKey = apt.date.slice(0, 7) // "YYYY-MM"
    if (!byMonth[monthKey]) byMonth[monthKey] = { total: 0, pago: 0, pendente: 0, count: 0 }
    const val = apt.value || 0
    byMonth[monthKey].total += val
    byMonth[monthKey].count += 1
    if (apt.paid) byMonth[monthKey].pago += val
    else byMonth[monthKey].pendente += val
  })

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => {
      const [year, m] = month.split('-')
      const label = new Date(parseInt(year), parseInt(m) - 1).toLocaleDateString('pt-BR', {
        month: 'long', year: 'numeric'
      })
      return {
        'Mês':                label,
        'Atendimentos':       data.count,
        'Total (R$)':         parseFloat(data.total.toFixed(2)),
        'Pago (R$)':          parseFloat(data.pago.toFixed(2)),
        'Pendente (R$)':      parseFloat(data.pendente.toFixed(2)),
      }
    })
}

// ---- applyColumnWidths ----
// Define largura mínima das colunas baseada no conteúdo
function applyColumnWidths(ws, data) {
  if (!data || data.length === 0) return
  const headers = Object.keys(data[0])
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length + 2, 12) }))
}

// ---- exportToXLSX ----
// Função principal: lê dados do sistema e dispara download do arquivo.
// fileName: nome sugerido para o arquivo (sem extensão)
export function exportToXLSX(fileName = 'agendafisio-export') {
  const patients = patientService.getAll()
  const appointments = appointmentService.getAll()

  const wb = XLSX.utils.book_new()

  // Aba 1: Atendimentos
  const aptRows = buildAppointmentsSheet(appointments, patients)
  const wsApt = XLSX.utils.json_to_sheet(aptRows)
  applyColumnWidths(wsApt, aptRows)
  XLSX.utils.book_append_sheet(wb, wsApt, 'Atendimentos')

  // Aba 2: Pacientes
  const patRows = buildPatientsSheet(patients)
  const wsPat = XLSX.utils.json_to_sheet(patRows)
  applyColumnWidths(wsPat, patRows)
  XLSX.utils.book_append_sheet(wb, wsPat, 'Pacientes')

  // Aba 3: Resumo Financeiro
  const summaryRows = buildSummarySheet(appointments)
  if (summaryRows.length > 0) {
    const wsSum = XLSX.utils.json_to_sheet(summaryRows)
    applyColumnWidths(wsSum, summaryRows)
    XLSX.utils.book_append_sheet(wb, wsSum, 'Resumo Financeiro')
  }

  // Aba 4: Evoluções (só se houver alguma registrada)
  const evoRows = buildEvolutionsSheet(appointments, patients)
  if (evoRows.length > 0) {
    const wsEvo = XLSX.utils.json_to_sheet(evoRows)
    applyColumnWidths(wsEvo, evoRows)
    XLSX.utils.book_append_sheet(wb, wsEvo, 'Evoluções')
  }

  // Gera nome do arquivo com data atual
  const today = new Date().toISOString().split('T')[0]
  const fullName = `${fileName}-${today}.xlsx`

  // writeFile do SheetJS dispara o download no navegador
  XLSX.writeFile(wb, fullName)

  return {
    fileName: fullName,
    appointmentsExported: appointments.length,
    patientsExported: patients.length,
    evolutionsExported: evoRows.length,
  }
}
