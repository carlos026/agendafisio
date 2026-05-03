import React, { useState } from 'react'
import { useApp } from '../../App'
import * as appointmentService from '../../services/appointmentService'
import { formatCurrency, getTodayString, getRelativeDateLabel } from '../../utils/helpers'
import AppointmentForm from './AppointmentForm'

const STATUS_MAP = {
  scheduled: ['badge-primary', 'Agendado'],
  completed:  ['badge-success', 'Concluído'],
  cancelled:  ['badge-danger',  'Cancelado'],
}

export default function AgendaPage() {
  const { patients, appointments, refreshAppointments } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [filter, setFilter]     = useState('upcoming')

  const today = getTodayString()

  const getPatientName = (id) => {
    const p = patients.find(p => p.id === id)
    return p ? p.name : 'Paciente removido'
  }

  // Filtra e ordena conforme a aba ativa
  let filtered = [...appointments]
  if (filter === 'upcoming') {
    filtered = filtered
      .filter(a => a.date >= today && a.status === 'scheduled')
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
  } else if (filter === 'today') {
    filtered = filtered
      .filter(a => a.date === today)
      .sort((a, b) => a.time.localeCompare(b.time))
  } else {
    // Histórico: passados + concluídos + cancelados
    filtered = filtered
      .filter(a => a.date < today || a.status === 'completed' || a.status === 'cancelled')
      .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  }

  // Agrupa por data
  const grouped = filtered.reduce((acc, apt) => {
    if (!acc[apt.date]) acc[apt.date] = []
    acc[apt.date].push(apt)
    return acc
  }, {})

  function handleSave(data) {
    if (editing) {
      appointmentService.update(editing.id, data)
    } else {
      appointmentService.add(data)
    }
    refreshAppointments()
    closeForm()
  }

  function handleDelete(id) {
    if (window.confirm('Remover este agendamento?')) {
      appointmentService.remove(id)
      refreshAppointments()
    }
  }

  function handleConcluir(id) {
    const apt = appointmentService.getById(id)
    if (apt) {
      appointmentService.update(id, { ...apt, status: 'completed' })
      refreshAppointments()
    }
  }

  function handleTogglePaid(id) {
    appointmentService.togglePaid(id)
    refreshAppointments()
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  return (
    <div>
      {/* Abas de filtro */}
      <div className="filter-tabs">
        {[
          { id: 'upcoming', label: 'Próximos' },
          { id: 'today',    label: 'Hoje' },
          { id: 'past',     label: 'Histórico' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`filter-tab ${filter === tab.id ? 'active' : ''}`}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lista agrupada por data */}
      {Object.keys(grouped).length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-text">Nenhum agendamento</div>
          <div className="empty-subtext">Toque no + para agendar</div>
        </div>
      ) : (
        Object.entries(grouped).map(([date, apts]) => (
          <div key={date}>
            <div className="date-group-header">
              {getRelativeDateLabel(date)}
            </div>

            <div className="card-list">
              {apts.map(apt => {
                const [badgeClass, badgeLabel] = STATUS_MAP[apt.status] || STATUS_MAP.scheduled
                return (
                  <div key={apt.id} className={`appointment-card status-${apt.status}`}>
                    {/* Nome e status */}
                    <div className="appointment-header">
                      <div className="appointment-patient">{getPatientName(apt.patientId)}</div>
                      <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
                    </div>

                    {/* Hora e notas */}
                    <div className="appointment-meta">
                      <span>🕐 {apt.time}</span>
                      {apt.notes && <span>📝 {apt.notes}</span>}
                    </div>

                    {/* Rodapé: valor, pagamento, ações */}
                    <div className="appointment-footer">
                      <div className="flex items-center gap-2">
                        <span className="appointment-value">{formatCurrency(apt.value)}</span>
                        <button
                          className={`badge ${apt.paid ? 'badge-success' : 'badge-gray'}`}
                          style={{ border: 'none', cursor: 'pointer' }}
                          onClick={() => handleTogglePaid(apt.id)}
                          title="Clique para alternar pagamento"
                        >
                          {apt.paid ? '✓ Pago' : '○ Pendente'}
                        </button>
                      </div>

                      <div className="flex gap-1">
                        {apt.status === 'scheduled' && (
                          <button
                            className="btn btn-sm"
                            style={{ background: 'var(--success-light)', color: '#065f46' }}
                            onClick={() => handleConcluir(apt.id)}
                          >
                            ✓ Concluir
                          </button>
                        )}
                        <button className="btn-icon" onClick={() => { setEditing(apt); setShowForm(true) }} title="Editar">✏️</button>
                        <button className="btn-icon" onClick={() => handleDelete(apt.id)} title="Remover">🗑️</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* Botão flutuante */}
      <button
        className="fab"
        onClick={() => { setEditing(null); setShowForm(true) }}
        title="Novo agendamento"
      >
        +
      </button>

      {/* Modal */}
      {showForm && (
        <AppointmentForm
          appointment={editing}
          patients={patients}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </div>
  )
}
