// ===== Serviço de Importação de Planilha Excel =====
// Lê arquivo .xlsx, mapeia colunas para o modelo de dados do sistema
// e insere pacientes + agendamentos novos.

import * as XLSX from 'xlsx'
import * as patientService from './patientService'
import * as appointmentService from './appointmentService'
import {
  excelDateToISO,
  excelTimeToHHMM,
  parseStatus,
  parseConvenio,
  parseSessionNumber,
  parseTotalSessions,
} from '../utils/excelParser'

// Mapeamento: cabeçalho do Excel → chave interna normalizada
const COLUMN_MAP = {
  'Paciente':              'patientName',
  'Horário':               'time',
  'Status':                'status',
  'Descrição':             'description',
  'Sessões (Guia)':        'totalSessionsRaw',
  'Data do Atendimento':   'date',
  'Acesso':                'convenio',
  'Valor':                 'value',
  'Status Pagamento':      'paid',
  'Pagamento':             'paymentDate',
  'Observação':            'observation',
}

// Sheets que não contêm dados de atendimento (escala semanal, agenda simplificada)
const SKIP_SHEETS = new Set(['Agenda', 'Semana de Atendimentos'])

// ---- parseFile ----
// Lê um File .xlsx e retorna array de objetos com as colunas normalizadas.
// Cada objeto inclui `_sheet` (nome da aba de origem).
// Lança erro se o arquivo não for um xlsx válido ou não tiver abas reconhecíveis.
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'))

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const wb = XLSX.read(data, { type: 'array' })

        // Filtra apenas abas com estrutura de atendimentos
        const appointmentSheets = wb.SheetNames.filter(n => !SKIP_SHEETS.has(n))
        if (appointmentSheets.length === 0) {
          reject(new Error('Nenhuma aba de atendimentos encontrada na planilha'))
          return
        }

        const allRows = []

        appointmentSheets.forEach(sheetName => {
          const ws = wb.Sheets[sheetName]
          const raw = XLSX.utils.sheet_to_json(ws, { header: 1 })

          if (!raw || raw.length < 2) return

          const headers = raw[0]

          // Verifica se a aba tem a coluna "Paciente" — se não, pula
          if (!headers.includes('Paciente')) return

          // Processa cada linha de dados (pula cabeçalho)
          raw.slice(1).forEach(row => {
            // Ignora linha se nome do paciente estiver vazio
            const nameCell = row[headers.indexOf('Paciente')]
            if (!nameCell) return

            const obj = { _sheet: sheetName }
            headers.forEach((header, i) => {
              const key = COLUMN_MAP[header] || header
              obj[key] = row[i] ?? null
            })
            allRows.push(obj)
          })
        })

        if (allRows.length === 0) {
          reject(new Error('Nenhum dado de atendimento encontrado na planilha'))
          return
        }

        resolve(allRows)
      } catch (err) {
        reject(new Error(`Erro ao processar planilha: ${err.message}`))
      }
    }

    reader.readAsArrayBuffer(file)
  })
}

// ---- prepareImport ----
// Recebe o array de linhas brutas do parseFile e retorna:
//   rows: lista de objetos prontos para inserção (sem duplicatas)
//   newPatientNames: nomes de pacientes que serão criados
//   skipped: linhas ignoradas com motivo
// Não persiste nada — é apenas análise para o preview.
export function prepareImport(rawRows) {
  const existingPatients = patientService.getAll()
  const existingAppointments = appointmentService.getAll()

  // Índice de pacientes existentes por nome normalizado (sem espaços, minúsculo)
  const patientIndex = {}
  existingPatients.forEach(p => {
    patientIndex[p.name.trim().toLowerCase()] = p
  })

  // Índice de agendamentos existentes para detecção de duplicatas
  // Chave: "patientId|YYYY-MM-DD|HH:MM"
  const aptIndex = new Set(
    existingAppointments.map(a => `${a.patientId}|${a.date}|${a.time}`)
  )

  const rows = []
  const newPatientNames = new Set()
  const skipped = []

  rawRows.forEach((raw, i) => {
    const lineNum = i + 2 // linha real na planilha (1 = cabeçalho)

    // Normaliza nome do paciente
    const patientName = raw.patientName?.toString().trim()
    if (!patientName) {
      skipped.push({ lineNum, reason: 'Nome do paciente ausente' })
      return
    }

    // Converte data
    let date = null
    if (typeof raw.date === 'number') {
      date = excelDateToISO(raw.date)
    } else if (typeof raw.date === 'string' && raw.date.match(/\d{4}-\d{2}-\d{2}/)) {
      date = raw.date
    }
    if (!date) {
      skipped.push({ lineNum, reason: `Paciente "${patientName}": data inválida` })
      return
    }

    // Converte horário
    const time = typeof raw.time === 'number'
      ? excelTimeToHHMM(raw.time)
      : (raw.time?.toString() || '09:00')

    // Verifica se é paciente novo
    const nameKey = patientName.toLowerCase()
    const existingPatient = patientIndex[nameKey]
    if (!existingPatient) newPatientNames.add(patientName)

    // Determina patientId provisório para checagem de duplicata
    // (para pacientes novos, usa o próprio nome como chave temporária)
    const tempPatientId = existingPatient ? existingPatient.id : `__new__${nameKey}`

    // Verifica duplicata
    const dupKey = `${tempPatientId}|${date}|${time}`
    if (aptIndex.has(dupKey)) {
      skipped.push({ lineNum, reason: `Paciente "${patientName}" em ${date} ${time}: já importado` })
      return
    }
    aptIndex.add(dupKey) // marca para não duplicar dentro do próprio import

    // Monta objeto de linha limpo
    rows.push({
      patientName,
      date,
      time,
      status: parseStatus(raw.status),
      description: raw.description?.toString().trim() || '',
      notes: raw.observation?.toString().trim() || '',
      totalSessions: parseTotalSessions(raw.totalSessionsRaw),
      sessionNumber: parseSessionNumber(raw.description),
      convenio: parseConvenio(raw.convenio),
      value: typeof raw.value === 'number' ? raw.value : (parseFloat(raw.value) || 0),
      paid: raw.paid === true || raw.paid === 1,
      _sheet: raw._sheet,
      _isNewPatient: !existingPatient,
    })
  })

  return { rows, newPatientNames: [...newPatientNames], skipped }
}

// ---- executeImport ----
// Persiste efetivamente os dados preparados pelo prepareImport.
// Cria pacientes novos e agendamentos.
// Retorna { patientsCreated, appointmentsCreated, errors }.
export function executeImport(rows) {
  const existingPatients = patientService.getAll()

  // Índice atualizado de pacientes (incluindo os que serão criados)
  const patientIndex = {}
  existingPatients.forEach(p => {
    patientIndex[p.name.trim().toLowerCase()] = p
  })

  const patientsCreated = []
  const appointmentsCreated = []
  const errors = []

  rows.forEach((row, i) => {
    try {
      const nameKey = row.patientName.toLowerCase()
      let patient = patientIndex[nameKey]

      // Cria paciente se não existir ainda
      if (!patient) {
        patient = patientService.add({
          name: row.patientName,
          convenio: row.convenio,
          phone: '',
          notes: '',
        })
        patientIndex[nameKey] = patient
        patientsCreated.push(patient)
      }

      // Combina descrição + observação nas notas
      const noteParts = []
      if (row.description) noteParts.push(row.description)
      if (row.notes) noteParts.push(row.notes)

      const apt = appointmentService.add({
        patientId: patient.id,
        serviceType: 'Fisioterapia Pélvica',
        date: row.date,
        time: row.time,
        status: row.status,
        value: row.value,
        paid: row.paid,
        notes: noteParts.join(' | '),
        totalSessions: row.totalSessions,
        sessionNumber: row.sessionNumber,
      })
      appointmentsCreated.push(apt)
    } catch (err) {
      errors.push(`Linha ${i + 2}: ${err.message}`)
    }
  })

  return { patientsCreated, appointmentsCreated, errors }
}
