import React, { useState } from 'react'
import { useApp } from '../../App'
import * as patientService from '../../services/patientService'
import { getInitials, getTodayString, getLastPlanSession } from '../../utils/helpers'
import PatientForm from './PatientForm'

const CONVENIO_LABEL = { convenio: 'Convênio', particular: 'Particular' }

export default function PatientsPage() {
  const { patients, appointments, refreshPatients } = useApp()
  const [search, setSearch]             = useState('')
  const [showForm, setShowForm]         = useState(false)
  const [editing, setEditing]           = useState(null)
  const [showConcluidos, setShowConcluidos] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [showNaoIniciou, setShowNaoIniciou] = useState(false)

  const query = search.toLowerCase()
  const matches = p =>
    p.name.toLowerCase().includes(query) || (p.phone || '').includes(query)

  const today = getTodayString()

  // Pacientes com avaliação marcada como "Não iniciou sessões"
  // Busca o agendamento mais recente com essa flag para exibir a data
  const naoIniciouMap = (appointments || [])
    .filter(a => a.naoIniciouSessoes)
    .reduce((acc, a) => {
      if (!acc[a.patientId] || a.date > acc[a.patientId].date) acc[a.patientId] = a
      return acc
    }, {})

  // Tem alguma sessão (não avaliação) agendada/realizada? Se sim, iniciou o tratamento
  const hasSessions = patientId => (appointments || []).some(
    a => a.patientId === patientId && a.appointmentType !== 'avaliacao' && a.status !== 'cancelled'
  )

  // Classifica cada paciente em um único grupo (prioridade: desistiu > concluiu > não iniciou > ativo)
  // Concluiu = a última sessão do plano já aconteceu (data <= hoje)
  function getGroup(p) {
    if (p.active === false) return 'desistiu'
    const lastSession = getLastPlanSession(p.id, appointments)
    if (lastSession && lastSession.date <= today) return 'concluiu'
    if (naoIniciouMap[p.id] && !hasSessions(p.id)) return 'naoIniciou'
    return 'ativo'
  }

  const groups = { ativo: [], concluiu: [], desistiu: [], naoIniciou: [] }
  patients.filter(matches).forEach(p => groups[getGroup(p)].push(p))
  const {
    ativo: activePatients,
    concluiu: concluidoPatients,
    desistiu: inactivePatients,
    naoIniciou: naoIniciouPatients,
  } = groups
  const hasAnyPatient = patients.some(matches)

  // Data da última sessão do plano, para exibir no card dos concluídos
  const concluidoDate = id => getLastPlanSession(id, appointments)?.date

  function handleSave(data) {
    if (editing) {
      patientService.update(editing.id, data)
    } else {
      patientService.add(data)
    }
    refreshPatients()
    closeForm()
  }

  function handleEdit(patient) {
    setEditing(patient)
    setShowForm(true)
  }

  function handleDelete(id) {
    if (window.confirm('Remover este paciente? Os agendamentos vinculados não serão apagados.')) {
      patientService.remove(id)
      refreshPatients()
    }
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  return (
    <div>
      {/* Busca */}
      <div className="search-box">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="search-input"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* ---- Lista de pacientes ativos ---- */}
      {!hasAnyPatient ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-text">
            {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
          </div>
          {!search && <div className="empty-subtext">Toque no + para adicionar</div>}
        </div>
      ) : activePatients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-text">Nenhum paciente ativo encontrado</div>
        </div>
      ) : (
        <div className="card-list">
          {activePatients.map(patient => (
            <PatientCard
              key={patient.id}
              patient={patient}
              onEdit={() => handleEdit(patient)}
              onDelete={() => handleDelete(patient.id)}
            />
          ))}
        </div>
      )}

      {/* ---- Seção: Sessões concluídas ---- */}
      {concluidoPatients.length > 0 && (
        <div className="inactive-section">
          <button
            className="inactive-section-toggle concluido-toggle"
            onClick={() => setShowConcluidos(v => !v)}
          >
            <span className="inactive-section-label">
              ✓ Sessões concluídas ({concluidoPatients.length})
            </span>
            <span className="inactive-section-chevron">
              {showConcluidos ? '▲' : '▼'}
            </span>
          </button>

          {showConcluidos && (
            <div className="card-list" style={{ marginTop: '8px' }}>
              {concluidoPatients.map(patient => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  concluido
                  concluidoDate={concluidoDate(patient.id)}
                  onEdit={() => handleEdit(patient)}
                  onDelete={() => handleDelete(patient.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Seção de pacientes inativos ---- */}
      {inactivePatients.length > 0 && (
        <div className="inactive-section">
          <button
            className="inactive-section-toggle"
            onClick={() => setShowInactive(v => !v)}
          >
            <span className="inactive-section-label">
              Desistentes ({inactivePatients.length})
            </span>
            <span className="inactive-section-chevron">
              {showInactive ? '▲' : '▼'}
            </span>
          </button>

          {showInactive && (
            <div className="card-list" style={{ marginTop: '8px' }}>
              {inactivePatients.map(patient => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  inactive
                  onEdit={() => handleEdit(patient)}
                  onDelete={() => handleDelete(patient.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---- Seção: Não iniciaram sessões ---- */}
      {naoIniciouPatients.length > 0 && (
        <div className="inactive-section">
          <button
            className="inactive-section-toggle nao-iniciou-toggle"
            onClick={() => setShowNaoIniciou(v => !v)}
          >
            <span className="inactive-section-label">
              ⚠ Não iniciaram sessões ({naoIniciouPatients.length})
            </span>
            <span className="inactive-section-chevron">
              {showNaoIniciou ? '▲' : '▼'}
            </span>
          </button>

          {showNaoIniciou && (
            <div className="card-list" style={{ marginTop: '8px' }}>
              {naoIniciouPatients.map(patient => (
                <PatientCard
                  key={patient.id}
                  patient={patient}
                  naoIniciou
                  avalDate={naoIniciouMap[patient.id]?.date}
                  onEdit={() => handleEdit(patient)}
                  onDelete={() => handleDelete(patient.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Botão flutuante para adicionar */}
      <button
        className="fab"
        onClick={() => { setEditing(null); setShowForm(true) }}
        title="Novo paciente"
      >
        +
      </button>

      {/* Modal de formulário */}
      {showForm && (
        <PatientForm
          patient={editing}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </div>
  )
}

const DAY_ABBR   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MONTH_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatAvalDate(dateStr) {
  if (!dateStr) return null
  const dt = new Date(dateStr + 'T12:00:00')
  return `${DAY_ABBR[dt.getDay()]}, ${dt.getDate()} ${MONTH_ABBR[dt.getMonth()]}`
}

// ---- Card de paciente (ativo, concluído, inativo ou não iniciou) ----
function PatientCard({ patient, inactive, concluido, concluidoDate, naoIniciou, avalDate, onEdit, onDelete }) {
  return (
    <div className={`patient-card ${inactive ? 'patient-card--inactive' : ''}`}>
      <div className={`patient-avatar ${inactive ? 'patient-avatar--inactive' : ''}`}>
        {getInitials(patient.name)}
      </div>

      <div className="patient-info">
        <div className="patient-name">
          {patient.name}
          {inactive && <span className="patient-inactive-badge">Desistiu</span>}
          {concluido && <span className="patient-concluido-badge">✓ Concluiu</span>}
          {naoIniciou && <span className="patient-nao-iniciou-badge">⚠ Não iniciou</span>}
        </div>
        {patient.phone && (
          <div className="patient-phone">📱 {patient.phone}</div>
        )}
        {patient.convenio && CONVENIO_LABEL[patient.convenio] && (
          <div className="text-xs text-muted mt-1">
            {CONVENIO_LABEL[patient.convenio]}
          </div>
        )}
        {concluido && concluidoDate && (
          <div className="text-xs mt-1" style={{ color: 'var(--success)' }}>
            Última sessão: {formatAvalDate(concluidoDate)}
          </div>
        )}
        {naoIniciou && avalDate && (
          <div className="text-xs mt-1" style={{ color: 'var(--warning)' }}>
            Avaliação: {formatAvalDate(avalDate)}
          </div>
        )}
        {patient.notes && (
          <div className="text-xs text-muted mt-1 truncate">{patient.notes}</div>
        )}
      </div>

      <div className="patient-actions">
        <button className="btn-icon" onClick={onEdit} title="Editar">✏️</button>
        <button className="btn-icon" onClick={onDelete} title="Remover">🗑️</button>
      </div>
    </div>
  )
}
