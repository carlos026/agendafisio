import React, { useState } from 'react'
import { useApp } from '../../App'
import * as patientService from '../../services/patientService'
import { getInitials } from '../../utils/helpers'
import PatientForm from './PatientForm'

export default function PatientsPage() {
  const { patients, refreshPatients } = useApp()
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search)
  )

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

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <div className="empty-text">
            {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
          </div>
          {!search && <div className="empty-subtext">Toque no + para adicionar</div>}
        </div>
      ) : (
        <div className="card-list">
          {filtered.map(patient => (
            <div key={patient.id} className="patient-card">
              <div className="patient-avatar">{getInitials(patient.name)}</div>

              <div className="patient-info">
                <div className="patient-name">{patient.name}</div>
                {patient.phone && (
                  <div className="patient-phone">📱 {patient.phone}</div>
                )}
                {patient.notes && (
                  <div className="text-xs text-muted mt-1 truncate">{patient.notes}</div>
                )}
              </div>

              <div className="patient-actions">
                <button className="btn-icon" onClick={() => handleEdit(patient)} title="Editar">✏️</button>
                <button className="btn-icon" onClick={() => handleDelete(patient.id)} title="Remover">🗑️</button>
              </div>
            </div>
          ))}
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
