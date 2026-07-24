// ===== Serviço de Importação de Planilha Excel =====
// Lê arquivo .xlsx, mapeia colunas para o modelo de dados do sistema
// e insere pacientes + agendamentos (evoluções clínicas e tipos de
// atendimento) novos.
//
// Reconhece dois formatos de cabeçalho para a aba de atendimentos:
//  - o gerado pela própria exportação do sistema (src/services/excelExport.js),
//    para permitir reimportar um backup;
//  - um formato legado de planilha externa (de um sistema anterior).
//
// As abas "Pacientes", "Evoluções" e "Tipos de Atendimento" (geradas pela
// própria exportação) também são reconhecidas:
//  - "Pacientes" enriquece pacientes novos com data de nascimento, queixa
//    principal, telefone, situação e observações — e cria diretamente
//    pacientes que não têm nenhum atendimento na planilha;
//  - "Evoluções" religa cada linha ao atendimento exato através de
//    "Paciente" + "Data do Atendimento" + "Horário";
//  - "Tipos de Atendimento" substitui a lista configurada em Configurações.

import * as XLSX from 'xlsx'
import * as patientService from './patientService'
import * as appointmentService from './appointmentService'
import * as settingsService from './settingsService'
import {
  excelDateToISO,
  excelTimeToHHMM,
  parseDateString,
  parseStatus,
  parseConvenio,
  parseSessionNumber,
  parseIntOrNull,
  parsePaid,
  parseAppointmentType,
  parseActive,
} from '../utils/excelParser'

// Mapeamento: cabeçalho do Excel → chave interna normalizada (aba de atendimentos)
const COLUMN_MAP = {
  // ---- formato gerado pela exportação do próprio sistema ----
  'Paciente':              'patientName',
  'Data do Atendimento':   'date',
  'Horário':               'time',
  'Status':                'status',
  'Tipo de Atendimento':   'serviceType',
  'Tipo de Consulta':      'appointmentTypeRaw',
  'Sessão':                'sessionNumberRaw',
  'Total de Sessões':      'totalSessionsRaw',
  'Convênio':              'convenioRaw',
  'Valor (R$)':            'value',
  'Pago':                  'paidRaw',
  'Observações':           'notes',

  // ---- formato legado (planilha externa de um sistema anterior) ----
  'Descrição':             'description',
  'Sessões (Guia)':        'totalSessionsRaw',
  'Acesso':                'convenioRaw',
  'Valor':                 'value',
  'Status Pagamento':      'paidRaw',
  'Pagamento':             'paymentDate',
  'Observação':            'notes',
}

// Mapeamento de cabeçalhos da aba "Evoluções"
const EVOLUTION_COLUMN_MAP = {
  'Paciente':             'patientName',
  'Data do Atendimento':  'date',
  'Horário':              'time',
  'Data da Evolução':     'evolutionDate',
  'PA Inicial':           'paInicial',
  'PA Final':             'paFinal',
  'Saturação Inicial':    'satInicial',
  'Saturação Final':      'satFinal',
  'FC Inicial':           'fcInicial',
  'FC Final':             'fcFinal',
  'Evolução':             'texto',
}

// Mapeamento de cabeçalhos da aba "Pacientes"
const PATIENT_COLUMN_MAP = {
  'Nome':                 'patientName',
  'Data de Nascimento':   'birthDateRaw',
  'Queixa Principal':     'mainComplaint',
  'Telefone':             'phone',
  'Convênio':             'convenioRaw',
  'Situação':             'activeRaw',
  'Observações':          'notes',
}

// Mapeamento de cabeçalhos da aba "Tipos de Atendimento"
const SERVICE_TYPE_COLUMN_MAP = {
  'Tipo':                       'typeName',
  'Preço Convênio (R$)':        'convenioPriceRaw',
  'Preço Particular (R$)':      'particularPriceRaw',
}

const EVOLUTION_SHEET_NAME = 'Evoluções'
const PATIENT_SHEET_NAME = 'Pacientes'
const SERVICE_TYPE_SHEET_NAME = 'Tipos de Atendimento'

// Sheets que não contêm dados de atendimento (escala semanal, agenda simplificada,
// e as demais abas geradas pela própria exportação do sistema)
const NON_APPOINTMENT_SHEETS = new Set([
  'Agenda', 'Semana de Atendimentos',
  PATIENT_SHEET_NAME, 'Resumo Financeiro', EVOLUTION_SHEET_NAME, SERVICE_TYPE_SHEET_NAME,
])

// Lê uma aba como array de objetos usando um columnMap, filtrando linhas sem
// a coluna-chave (por padrão "Paciente"; "Nome" para a aba Pacientes, "Tipo"
// para a aba Tipos de Atendimento).
function readSheetRows(wb, sheetName, columnMap, keyHeader = 'Paciente') {
  const ws = wb.Sheets[sheetName]
  if (!ws) return []
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1 })
  if (!raw || raw.length < 2) return []

  const headers = raw[0]
  if (!headers.includes(keyHeader)) return []

  const rows = []
  raw.slice(1).forEach(row => {
    const keyCell = row[headers.indexOf(keyHeader)]
    if (!keyCell) return

    const obj = { _sheet: sheetName }
    headers.forEach((header, i) => {
      const key = columnMap[header] || header
      obj[key] = row[i] ?? null
    })
    rows.push(obj)
  })
  return rows
}

// ---- parseFile ----
// Lê um File .xlsx e retorna { appointmentRows, evolutionRows, patientRows, serviceTypeRows },
// cada um array de objetos com as colunas normalizadas.
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
        const appointmentSheetNames = wb.SheetNames.filter(n => !NON_APPOINTMENT_SHEETS.has(n))

        const appointmentRows = []
        appointmentSheetNames.forEach(sheetName => {
          appointmentRows.push(...readSheetRows(wb, sheetName, COLUMN_MAP, 'Paciente'))
        })

        const evolutionRows = wb.SheetNames.includes(EVOLUTION_SHEET_NAME)
          ? readSheetRows(wb, EVOLUTION_SHEET_NAME, EVOLUTION_COLUMN_MAP, 'Paciente')
          : []

        const patientRows = wb.SheetNames.includes(PATIENT_SHEET_NAME)
          ? readSheetRows(wb, PATIENT_SHEET_NAME, PATIENT_COLUMN_MAP, 'Nome')
          : []

        const serviceTypeRows = wb.SheetNames.includes(SERVICE_TYPE_SHEET_NAME)
          ? readSheetRows(wb, SERVICE_TYPE_SHEET_NAME, SERVICE_TYPE_COLUMN_MAP, 'Tipo')
          : []

        if (appointmentRows.length === 0 && evolutionRows.length === 0 && patientRows.length === 0 && serviceTypeRows.length === 0) {
          reject(new Error('Nenhum dado reconhecido na planilha'))
          return
        }

        resolve({ appointmentRows, evolutionRows, patientRows, serviceTypeRows })
      } catch (err) {
        reject(new Error(`Erro ao processar planilha: ${err.message}`))
      }
    }

    reader.readAsArrayBuffer(file)
  })
}

// ---- preparePatientDetails ----
// Recebe as linhas brutas da aba "Pacientes" e retorna um mapa
// nome(minúsculo) → dados cadastrais, usado para enriquecer pacientes novos
// (criados a partir de atendimentos) e para criar pacientes sem nenhum
// atendimento na planilha.
export function preparePatientDetails(patientRows) {
  const map = {}
  patientRows.forEach(raw => {
    const name = raw.patientName?.toString().trim()
    if (!name) return
    map[name.toLowerCase()] = {
      name,
      birthDate: parseDateString(raw.birthDateRaw) || '',
      mainComplaint: raw.mainComplaint?.toString().trim() || '',
      phone: raw.phone?.toString().trim() || '',
      convenio: parseConvenio(raw.convenioRaw),
      active: parseActive(raw.activeRaw),
      notes: raw.notes?.toString().trim() || '',
    }
  })
  return map
}

// ---- prepareServiceTypes ----
// Recebe as linhas brutas da aba "Tipos de Atendimento" e retorna a lista
// pronta para substituir settings.serviceTypes.
export function prepareServiceTypes(serviceTypeRows) {
  return serviceTypeRows
    .map(raw => {
      const name = raw.typeName?.toString().trim()
      if (!name) return null
      return {
        name,
        convenioPrice: parseFloat(raw.convenioPriceRaw) || 0,
        particularPrice: parseFloat(raw.particularPriceRaw) || 0,
      }
    })
    .filter(Boolean)
}

// ---- prepareImport ----
// Recebe o array de linhas brutas de atendimento (parseFile().appointmentRows) e retorna:
//   rows: lista de objetos prontos para inserção (sem duplicatas), cada um com `_matchKey`
//         ("<patientId ou __new__<nome>>|data|hora") — usado depois para religar evoluções
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

    // Converte data — aceita serial do Excel, "YYYY-MM-DD" ou "DD/MM/YYYY"
    const date = typeof raw.date === 'number' ? excelDateToISO(raw.date) : parseDateString(raw.date)
    if (!date) {
      skipped.push({ lineNum, reason: `Paciente "${patientName}": data inválida` })
      return
    }

    // Converte horário
    const time = typeof raw.time === 'number'
      ? excelTimeToHHMM(raw.time)
      : (raw.time?.toString().trim() || '09:00')

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

    // Número da sessão: prioriza a coluna "Sessão" (formato atual);
    // sem ela, tenta extrair da "Descrição" (formato legado)
    const sessionNumber = raw.sessionNumberRaw != null
      ? parseIntOrNull(raw.sessionNumberRaw)
      : parseSessionNumber(raw.description)

    // Monta objeto de linha limpo
    rows.push({
      patientName,
      date,
      time,
      status: parseStatus(raw.status),
      serviceType: raw.serviceType?.toString().trim() || 'Fisioterapia Pélvica',
      appointmentType: parseAppointmentType(raw.appointmentTypeRaw),
      description: raw.description?.toString().trim() || '',
      notes: raw.notes?.toString().trim() || '',
      totalSessions: parseIntOrNull(raw.totalSessionsRaw),
      sessionNumber,
      convenio: parseConvenio(raw.convenioRaw),
      value: typeof raw.value === 'number' ? raw.value : (parseFloat(raw.value) || 0),
      paid: parsePaid(raw.paidRaw),
      _sheet: raw._sheet,
      _isNewPatient: !existingPatient,
      _matchKey: dupKey,
    })
  })

  return { rows, newPatientNames: [...newPatientNames], skipped }
}

// ---- prepareEvolutions ----
// Recebe o array de linhas brutas da aba "Evoluções" e os `rows` já preparados
// por prepareImport (para saber quais atendimentos serão criados neste mesmo
// import). Cada evolução só é aceita se existir um atendimento correspondente
// — já no sistema ou prestes a ser criado — com o mesmo paciente+data+hora.
// Não persiste nada — é apenas análise para o preview.
export function prepareEvolutions(evolutionRows, preparedAppointmentRows) {
  const existingPatients = patientService.getAll()
  const patientIndex = {}
  existingPatients.forEach(p => {
    patientIndex[p.name.trim().toLowerCase()] = p
  })

  // Chaves de atendimentos disponíveis: já existentes + sendo criados neste import
  const availableKeys = new Set(
    appointmentService.getAll().map(a => `${a.patientId}|${a.date}|${a.time}`)
  )
  preparedAppointmentRows.forEach(row => availableKeys.add(row._matchKey))

  const prepared = []
  const skipped = []

  evolutionRows.forEach((raw, i) => {
    const lineNum = i + 2

    const patientName = raw.patientName?.toString().trim()
    if (!patientName) {
      skipped.push({ lineNum, reason: 'Nome do paciente ausente' })
      return
    }

    const date = typeof raw.date === 'number' ? excelDateToISO(raw.date) : parseDateString(raw.date)
    if (!date) {
      skipped.push({ lineNum, reason: `Paciente "${patientName}": data do atendimento inválida` })
      return
    }

    const time = typeof raw.time === 'number'
      ? excelTimeToHHMM(raw.time)
      : (raw.time?.toString().trim() || '')
    if (!time) {
      skipped.push({ lineNum, reason: `Paciente "${patientName}" em ${date}: horário ausente` })
      return
    }

    const nameKey = patientName.toLowerCase()
    const existingPatient = patientIndex[nameKey]
    const tempPatientId = existingPatient ? existingPatient.id : `__new__${nameKey}`
    const matchKey = `${tempPatientId}|${date}|${time}`

    if (!availableKeys.has(matchKey)) {
      skipped.push({ lineNum, reason: `Paciente "${patientName}" em ${date} ${time}: nenhum atendimento correspondente encontrado` })
      return
    }

    const evolutionDate = typeof raw.evolutionDate === 'number'
      ? excelDateToISO(raw.evolutionDate)
      : (parseDateString(raw.evolutionDate) || date)

    prepared.push({
      patientName,
      date,
      time,
      evolutionDate,
      paInicial: raw.paInicial?.toString().trim() || '',
      paFinal: raw.paFinal?.toString().trim() || '',
      satInicial: raw.satInicial?.toString().trim() || '',
      satFinal: raw.satFinal?.toString().trim() || '',
      fcInicial: raw.fcInicial?.toString().trim() || '',
      fcFinal: raw.fcFinal?.toString().trim() || '',
      texto: raw.texto?.toString().trim() || '',
      _matchKey: matchKey,
    })
  })

  return { rows: prepared, skipped }
}

// ---- executeImport ----
// Persiste efetivamente os dados preparados por prepareImport/prepareEvolutions/
// preparePatientDetails/prepareServiceTypes. Cria pacientes novos (enriquecidos
// com dados da aba Pacientes quando disponíveis, incluindo pacientes sem
// nenhum atendimento na planilha), agendamentos, religa as evoluções aos
// atendimentos certos, e substitui os tipos de atendimento configurados
// quando a aba correspondente estiver presente.
// Retorna { patientsCreated, appointmentsCreated, errors, evolutionsImported,
//           evolutionErrors, serviceTypesImported }.
export function executeImport(rows, evolutions = [], patientDetails = {}, serviceTypes = null) {
  const existingPatients = patientService.getAll()

  // Índice atualizado de pacientes (incluindo os que serão criados)
  const patientIndex = {}
  existingPatients.forEach(p => {
    patientIndex[p.name.trim().toLowerCase()] = p
  })

  // Índice chave(paciente|data|hora) → id do atendimento, para religar evoluções.
  // Começa com os atendimentos já existentes.
  const keyToAppointmentId = new Map()
  appointmentService.getAll().forEach(a => {
    keyToAppointmentId.set(`${a.patientId}|${a.date}|${a.time}`, a.id)
  })

  const patientsCreated = []
  const appointmentsCreated = []
  const errors = []

  function createPatientFrom(name, fallbackConvenio) {
    const nameKey = name.toLowerCase()
    const details = patientDetails[nameKey]
    const patient = patientService.add({
      name,
      convenio: details?.convenio || fallbackConvenio || '',
      birthDate: details?.birthDate || '',
      mainComplaint: details?.mainComplaint || '',
      phone: details?.phone || '',
      notes: details?.notes || '',
      active: details ? details.active : true,
    })
    patientIndex[nameKey] = patient
    patientsCreated.push(patient)
    return patient
  }

  rows.forEach((row, i) => {
    try {
      const nameKey = row.patientName.toLowerCase()
      let patient = patientIndex[nameKey]

      // Cria paciente se não existir ainda (enriquecido pela aba Pacientes, se houver)
      if (!patient) {
        patient = createPatientFrom(row.patientName, row.convenio)
      }

      // Combina descrição (formato legado) + observação nas notas
      const noteParts = []
      if (row.description) noteParts.push(row.description)
      if (row.notes) noteParts.push(row.notes)

      const apt = appointmentService.add({
        patientId: patient.id,
        serviceType: row.serviceType,
        appointmentType: row.appointmentType,
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

      // `row._matchKey` foi calculado com o mesmo esquema (patientId real ou
      // __new__<nome>) usado por prepareEvolutions — basta apontá-lo pro id real.
      if (row._matchKey) keyToAppointmentId.set(row._matchKey, apt.id)
    } catch (err) {
      errors.push(`Linha ${i + 2}: ${err.message}`)
    }
  })

  // Pacientes presentes na aba "Pacientes" mas sem nenhum atendimento na
  // planilha (não foram criados pelo laço acima) — cria diretamente.
  Object.keys(patientDetails).forEach(nameKey => {
    if (!patientIndex[nameKey]) {
      createPatientFrom(patientDetails[nameKey].name)
    }
  })

  const evolutionsImported = []
  const evolutionErrors = []

  evolutions.forEach((evo, i) => {
    try {
      const appointmentId = keyToAppointmentId.get(evo._matchKey)
      if (!appointmentId) {
        evolutionErrors.push(`Linha ${i + 2}: nenhum atendimento correspondente encontrado`)
        return
      }
      appointmentService.saveEvolution(appointmentId, {
        data: evo.evolutionDate,
        paInicial: evo.paInicial,
        paFinal: evo.paFinal,
        satInicial: evo.satInicial,
        satFinal: evo.satFinal,
        fcInicial: evo.fcInicial,
        fcFinal: evo.fcFinal,
        texto: evo.texto,
      })
      evolutionsImported.push(appointmentId)
    } catch (err) {
      evolutionErrors.push(`Linha ${i + 2}: ${err.message}`)
    }
  })

  let serviceTypesImported = 0
  if (serviceTypes && serviceTypes.length > 0) {
    settingsService.saveSettings({ serviceTypes })
    serviceTypesImported = serviceTypes.length
  }

  return { patientsCreated, appointmentsCreated, errors, evolutionsImported, evolutionErrors, serviceTypesImported }
}
