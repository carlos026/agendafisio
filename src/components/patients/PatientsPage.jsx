import React, { useState } from 'react'
import { useApp } from '../../App'
import * as patientService from '../../services/patientService'
import { getInitials } from '../../utils/helpers'
import PatientForm from './PatientForm'

const CONVENIO_LABEL = { convenio: 'Convênio', particular: 'Particular' }

export default function PatientsPage() {
  const { patients, refreshPatients } = useApp()
  const [search, setSearch]         = useState('')
  const [showForm, setShowForm]     = useState(false)
  const [editing, setEditing]       = useState(null)
  const [showInactive, setShowInactive] = useState(false)

  // Separa ativos de inativos, aplicando filtro de busca em ambos
  const query = search.toLowerCase()
  const matches = p =>
    p.name.toLowerCase().includes(query) || (p.phone || '').includes(query)

  const activePatients   = patients.filter(p => p.active !== false && matches(p))
  const inactivePatients = patients.filter(p => p.active === false && matches(p))

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
      {activePatients.length === 0 && inactivePatients.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-text">
            {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
          </div>
          {!search && <div className="empty-subtext">Toque no + para adicionar</div>}
        </div>
      ) : activePatients.length === 0 && search ? (
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

      {/* ---- Seção de pacientes inativos ---- */}
      {inactivePatients.length > 0 && (
        <div className="inactive-section">
          <button
            className="inactive-section-toggle"
            onClick={() => setShowInactive(v => !v)}
          >
            <span className="inactive-section-label">
              Desistiram ({inactivePatients.length})
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

// ---- Card de paciente (ativo ou inativo) ----
function PatientCard({ patient, inactive, onEdit, onDelete }) {
  return (
    <div className={`patient-card ${inactive ? 'patient-card--inactive' : ''}`}>
      <div className={`patient-avatar ${inactive ? 'patient-avatar--inactive' : ''}`}>
        {getInitials(patient.name)}
      </div>

      <div className="patient-info">
        <div className="patient-name">
          {patient.name}
          {inactive && <span className="patient-inactive-badge">Desistiu</span>}
        </div>
        {patient.phone && (
          <div className="patient-phone">📱 {patient.phone}</div>
        )}
        {patient.convenio && CONVENIO_LABEL[patient.convenio] && (
          <div className="text-xs text-muted mt-1">
            {CONVENIO_LABEL[patient.convenio]}
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
