import React, { useState } from 'react'
import { useApp } from '../../App'
import * as appointmentService from '../../services/appointmentService'
import { formatCurrency, getTodayString, getRelativeDateLabel } from '../../utils/helpers'
import AppointmentForm from './AppointmentForm'
import WeeklyView from './WeeklyView'
import DailyBoardView from './DailyBoardView'
import EvolutionModal from './EvolutionModal'

const STATUS_MAP = {
  scheduled: ['badge-primary', 'Agendado'],
  completed:  ['badge-success', 'Concluído'],
  cancelled:  ['badge-danger',  'Cancelado'],
}

const MONTH_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatMonthChip(yyyyMm) {
  const [year, month] = yyyyMm.split('-').map(Number)
  const currentYear   = new Date().getFullYear()
  const name          = MONTH_ABBR[month - 1]
  return year !== currentYear ? `${name} ${String(year).slice(2)}` : name
}

export default function AgendaPage() {
  const { patients, appointments, settings, refreshAppointments, setPage } = useApp()

  const [viewMode, setViewMode]             = useState('list') // 'list' | 'week' | 'board'
  const [showForm, setShowForm]             = useState(false)
  const [editing, setEditing]               = useState(null)
  const [filter, setFilter]                 = useState('upcoming')
  const [historyMonth, setHistoryMonth]     = useState(null)
  const [noPatientAlert, setNoPatientAlert] = useState(false)
  const [evolutionApt, setEvolutionApt]     = useState(null)

  const today = getTodayString()

  const getPatientName = (id) => {
    const p = patients.find(p => p.id === id)
    return p ? p.name : 'Paciente removido'
  }

  function openEdit(apt) {
    setEditing(apt)
    setShowForm(true)
  }

  // ── dados da lista ──
  const historyBase = appointments.filter(
    a => a.date < today || a.status === 'completed' || a.status === 'cancelled'
  )
  const availableMonths = [...new Set(historyBase.map(a => a.date.slice(0, 7)))]
    .sort((a, b) => b.localeCompare(a))

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
    filtered = historyBase.slice()
    if (historyMonth) filtered = filtered.filter(a => a.date.startsWith(historyMonth))
    filtered.sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
  }

  const grouped = filtered.reduce((acc, apt) => {
    if (!acc[apt.date]) acc[apt.date] = []
    acc[apt.date].push(apt)
    return acc
  }, {})

  // ── handlers ──
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

  function handleToggleNaoIniciou(id) {
    appointmentService.toggleNaoIniciouSessoes(id)
    refreshAppointments()
  }

  function handleSaveEvolution(data) {
    appointmentService.saveEvolution(evolutionApt.id, data)
    refreshAppointments()
    setEvolutionApt(null)
  }

  function handleStatusChange(id, newStatus) {
    const apt = appointmentService.getById(id)
    if (apt) {
      appointmentService.update(id, { ...apt, status: newStatus })
      refreshAppointments()
    }
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  return (
    <div>
      {/* ── Switcher de visualização ── */}
      <div className="agenda-view-switcher">
        <button
          className={`agenda-view-btn${viewMode === 'list' ? ' active' : ''}`}
          onClick={() => setViewMode('list')}
        >
          Lista
        </button>
        <button
          className={`agenda-view-btn${viewMode === 'week' ? ' active' : ''}`}
          onClick={() => setViewMode('week')}
        >
          Semana
        </button>
        <button
          className={`agenda-view-btn${viewMode === 'board' ? ' active' : ''}`}
          onClick={() => setViewMode('board')}
        >
          Board
        </button>
      </div>

      {/* ══════════════ LISTA ══════════════ */}
      {viewMode === 'list' && (
        <>
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

          {filter === 'past' && availableMonths.length > 0 && (
            <div className="history-month-strip">
              <button
                className={`history-month-chip ${!historyMonth ? 'active' : ''}`}
                onClick={() => setHistoryMonth(null)}
              >
                Todos
              </button>
              {availableMonths.map(m => (
                <button
                  key={m}
                  className={`history-month-chip ${historyMonth === m ? 'active' : ''}`}
                  onClick={() => setHistoryMonth(m)}
                >
                  {formatMonthChip(m)}
                </button>
              ))}
            </div>
          )}

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
                    const patientInactive = patients.find(p => p.id === apt.patientId)?.active === false
                    const isAvaliacao = apt.appointmentType === 'avaliacao' || apt.notes === 'Avaliação'
                    return (
                      <div key={apt.id} className={`appointment-card status-${apt.status}${patientInactive ? ' apt-patient-inactive' : ''}${isAvaliacao && apt.naoIniciouSessoes ? ' apt-nao-iniciou' : ''}`}>
                        <div className="appointment-header">
                          <div className="appointment-patient">{getPatientName(apt.patientId)}</div>
                          <span className={`badge ${badgeClass}`}>{badgeLabel}</span>
                        </div>
                        <div className="appointment-meta">
                          <span>🕐 {apt.time}</span>
                          {apt.serviceType && <span className="apt-service-type">{apt.serviceType}</span>}
                          {isAvaliacao
                            ? <>
                                <span className="apt-badge-avaliacao">Avaliação</span>
                                {apt.naoIniciouSessoes && (
                                  <span className="apt-badge-nao-iniciou">⚠ Não iniciou sessões</span>
                                )}
                              </>
                            : apt.totalSessions && (
                                <span className="apt-session-info">
                                  Sessão {apt.sessionNumber ?? '?'}/{apt.totalSessions}
                                </span>
                              )
                          }
                          {apt.notes && apt.notes !== 'Avaliação' && <span>📝 {apt.notes}</span>}
                        </div>
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
                            {apt.status === 'completed' && (
                              <button
                                className="btn btn-sm"
                                style={{
                                  background: apt.evolution ? 'var(--primary-light)' : 'var(--gray-100)',
                                  color: apt.evolution ? 'var(--primary-dark)' : 'var(--gray-600)',
                                }}
                                onClick={() => setEvolutionApt(apt)}
                              >
                                📋 {apt.evolution ? 'Ver Evolução' : 'Evolução'}
                              </button>
                            )}
                            {isAvaliacao && (
                              <button
                                className={`btn-nao-iniciou${apt.naoIniciouSessoes ? ' active' : ''}`}
                                onClick={() => handleToggleNaoIniciou(apt.id)}
                                title={apt.naoIniciouSessoes ? 'Clique para desfazer' : 'Marcar que não iniciou sessões'}
                              >
                                {apt.naoIniciouSessoes ? '⚠ Não iniciou' : '⚠ Não iniciou?'}
                              </button>
                            )}
                            <button className="btn-icon" onClick={() => openEdit(apt)} title="Editar">✏️</button>
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
        </>
      )}

      {/* ══════════════ SEMANA ══════════════ */}
      {viewMode === 'week' && (
        <WeeklyView
          appointments={appointments}
          patients={patients}
          onEditApt={openEdit}
        />
      )}

      {/* ══════════════ BOARD ══════════════ */}
      {viewMode === 'board' && (
        <DailyBoardView
          appointments={appointments}
          patients={patients}
          onStatusChange={handleStatusChange}
          onEditApt={openEdit}
        />
      )}

      {/* ── Alerta e FAB (todos os modos) ── */}
      {noPatientAlert && (
        <div className="no-patient-alert">
          <span>Cadastre um paciente antes de agendar.</span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setPage('patients')}
          >
            Ir para Pacientes
          </button>
          <button
            className="no-patient-alert-close"
            onClick={() => setNoPatientAlert(false)}
          >
            ✕
          </button>
        </div>
      )}

      <button
        className="fab"
        onClick={() => {
          if (patients.filter(p => p.active !== false).length === 0) {
            setNoPatientAlert(true)
            return
          }
          setNoPatientAlert(false)
          setEditing(null)
          setShowForm(true)
        }}
        title="Novo agendamento"
      >
        +
      </button>

      {showForm && (
        <AppointmentForm
          appointment={editing}
          patients={patients}
          appointments={appointments}
          settings={settings}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}

      {evolutionApt && (
        <EvolutionModal
          appointment={evolutionApt}
          patientName={getPatientName(evolutionApt.patientId)}
          onSave={handleSaveEvolution}
          onClose={() => setEvolutionApt(null)}
        />
      )}
    </div>
  )
}
