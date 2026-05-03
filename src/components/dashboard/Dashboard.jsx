import React from 'react'
import { useApp } from '../../App'
import {
  formatCurrency,
  getTodayString,
  getMonthAppointments,
  getCurrentMonth,
  getRelativeDateLabel,
} from '../../utils/helpers'

function StatusBadge({ status }) {
  const map = {
    scheduled: ['badge-primary', 'Agendado'],
    completed:  ['badge-success', 'Concluído'],
    cancelled:  ['badge-danger',  'Cancelado'],
  }
  const [cls, label] = map[status] || map.scheduled
  return <span className={`badge ${cls}`}>{label}</span>
}

export default function Dashboard() {
  const { patients, appointments, setPage } = useApp()

  const today = getTodayString()
  const { year, month } = getCurrentMonth()
  const monthApts = getMonthAppointments(appointments, year, month)

  // Agendamentos de hoje (exceto cancelados), ordenados por hora
  const todayApts = appointments
    .filter(a => a.date === today && a.status !== 'cancelled')
    .sort((a, b) => a.time.localeCompare(b.time))

  // Próximos agendamentos futuros (sem incluir hoje)
  const upcoming = appointments
    .filter(a => a.date > today && a.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 4)

  const totalReceived  = monthApts.filter(a => a.paid).reduce((s, a) => s + a.value, 0)
  const totalPending   = monthApts.filter(a => !a.paid && a.status !== 'cancelled').reduce((s, a) => s + a.value, 0)
  const completedCount = monthApts.filter(a => a.status === 'completed').length

  const getPatientName = (id) => {
    const p = patients.find(p => p.id === id)
    return p ? p.name : 'Paciente removido'
  }

  return (
    <div>
      {/* Cards de estatísticas */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-label">Recebido no Mês</div>
          <div className="stat-value" style={{ fontSize: '1.1rem' }}>
            {formatCurrency(totalReceived)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-label">Atendimentos</div>
          <div className="stat-value">{completedCount}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-label">Pacientes</div>
          <div className="stat-value">{patients.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-label">A Receber</div>
          <div className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--warning)' }}>
            {formatCurrency(totalPending)}
          </div>
        </div>
      </div>

      {/* Agendamentos de hoje */}
      <div className="section-header">
        <span className="section-title">Hoje</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setPage('agenda')}>
          Ver agenda →
        </button>
      </div>

      {todayApts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '6px' }}>📅</div>
          <div className="text-sm text-muted">Nenhum agendamento para hoje</div>
        </div>
      ) : (
        <div className="card-list">
          {todayApts.map(apt => (
            <div key={apt.id} className={`appointment-card status-${apt.status}`}>
              <div className="appointment-header">
                <div className="appointment-patient">{getPatientName(apt.patientId)}</div>
                <StatusBadge status={apt.status} />
              </div>
              <div className="appointment-meta">
                <span>🕐 {apt.time}</span>
                <span>💵 {formatCurrency(apt.value)}</span>
                {apt.paid && <span style={{ color: 'var(--success)' }}>✓ Pago</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Próximos agendamentos */}
      {upcoming.length > 0 && (
        <>
          <div className="section-header">
            <span className="section-title">Próximos</span>
          </div>
          <div className="card-list">
            {upcoming.map(apt => (
              <div key={apt.id} className="appointment-card">
                <div className="appointment-header">
                  <div className="appointment-patient">{getPatientName(apt.patientId)}</div>
                  <span className="badge badge-primary">{getRelativeDateLabel(apt.date)}</span>
                </div>
                <div className="appointment-meta">
                  <span>🕐 {apt.time}</span>
                  <span>💵 {formatCurrency(apt.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
