import React, { useState } from 'react'
import { useApp } from '../../App'
import * as appointmentService from '../../services/appointmentService'
import {
  formatCurrency,
  formatDate,
  formatMonthYear,
  getMonthAppointments,
  getCurrentMonth,
} from '../../utils/helpers'

export default function FinancePage() {
  const { patients, appointments, refreshAppointments } = useApp()

  // ---- view principal: mês ou pendências ----
  const [view, setView] = useState('month')

  // ---- estado da view "Mês" ----
  const current = getCurrentMonth()
  const [year, setYear]     = useState(current.year)
  const [month, setMonth]   = useState(current.month)
  const [filter, setFilter] = useState('all')

  // ---- dados da view "Mês" ----
  const monthApts  = getMonthAppointments(appointments, year, month)
  const activeApts = monthApts.filter(a => a.status !== 'cancelled')

  const totalReceived  = activeApts.filter(a => a.paid).reduce((s, a) => s + a.value, 0)
  const totalPending   = activeApts.filter(a => !a.paid).reduce((s, a) => s + a.value, 0)
  const totalApts      = activeApts.length
  const completedCount = activeApts.filter(a => a.status === 'completed').length

  // ---- dados da view "Pendências" — todos os meses ----
  const allPending = appointments
    .filter(a => !a.paid && a.status !== 'cancelled')
    .sort((a, b) => a.date.localeCompare(b.date)) // mais antigos primeiro

  // Agrupa por paciente, ordena pelo maior valor pendente
  const pendingGroups = Object.values(
    allPending.reduce((acc, apt) => {
      if (!acc[apt.patientId]) {
        acc[apt.patientId] = { patientId: apt.patientId, apts: [], total: 0 }
      }
      acc[apt.patientId].apts.push(apt)
      acc[apt.patientId].total += apt.value
      return acc
    }, {})
  ).sort((a, b) => b.total - a.total)

  const totalAllPending = allPending.reduce((s, a) => s + a.value, 0)

  // ---- handlers ----
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function handleTogglePaid(id) {
    appointmentService.togglePaid(id)
    refreshAppointments()
  }

  // Marca todos os atendimentos pendentes de um paciente como pagos de uma vez
  function handleMarkAllPaid(patientId) {
    const group = pendingGroups.find(g => g.patientId === patientId)
    if (!group) return
    group.apts.forEach(apt => appointmentService.togglePaid(apt.id))
    refreshAppointments()
  }

  const getPatientName = (id) => {
    const p = patients.find(p => p.id === id)
    return p ? p.name : 'Paciente removido'
  }

  // ---- filtro da view "Mês" ----
  let filtered = [...activeApts]
  if (filter === 'paid')    filtered = filtered.filter(a => a.paid)
  if (filter === 'pending') filtered = filtered.filter(a => !a.paid)
  filtered.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

  return (
    <div>
      {/* Toggle de visualização: Mês | Pendências */}
      <div className="finance-view-toggle">
        <button
          className={`finance-view-btn ${view === 'month' ? 'active' : ''}`}
          onClick={() => setView('month')}
        >
          Por Mês
        </button>
        <button
          className={`finance-view-btn ${view === 'pending' ? 'active' : ''}`}
          onClick={() => setView('pending')}
        >
          Pendências
          {allPending.length > 0 && (
            <span className="pending-count-badge">{allPending.length}</span>
          )}
        </button>
      </div>

      {/* ======================== VIEW: MÊS ======================== */}
      {view === 'month' && (
        <>
          <div className="month-selector">
            <button className="month-btn" onClick={prevMonth}>‹</button>
            <span className="month-label">{formatMonthYear(year, month)}</span>
            <button className="month-btn" onClick={nextMonth}>›</button>
          </div>

          <div className="finance-summary">
            <div className="finance-total">Total Recebido</div>
            <div className="finance-amount">{formatCurrency(totalReceived)}</div>
            <div className="finance-stats">
              <div className="finance-stat">
                <div className="finance-stat-label">A Receber</div>
                <div className="finance-stat-value">{formatCurrency(totalPending)}</div>
              </div>
              <div className="finance-stat">
                <div className="finance-stat-label">Atendimentos</div>
                <div className="finance-stat-value">{completedCount} / {totalApts}</div>
              </div>
            </div>
          </div>

          <div className="filter-tabs">
            {[
              { id: 'all',     label: 'Todos' },
              { id: 'paid',    label: 'Pagos' },
              { id: 'pending', label: 'Pendentes' },
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

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💰</div>
              <div className="empty-text">Nenhum atendimento neste período</div>
            </div>
          ) : (
            <div className="card-list">
              {filtered.map(apt => {
                const patientInactive = patients.find(p => p.id === apt.patientId)?.active === false
                return (
                  <div key={apt.id} className={`card${patientInactive ? ' apt-patient-inactive' : ''}`}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="font-semibold truncate">{getPatientName(apt.patientId)}</div>
                        <div className="text-xs text-muted mt-1">
                          {formatDate(apt.date)} às {apt.time}
                          {apt.status === 'completed' && (
                            <span style={{ color: 'var(--success)', marginLeft: '6px' }}>• Concluído</span>
                          )}
                          {apt.status === 'scheduled' && (
                            <span style={{ color: 'var(--primary)', marginLeft: '6px' }}>• Agendado</span>
                          )}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div className="font-bold" style={{ fontSize: '1rem' }}>
                          {formatCurrency(apt.value)}
                        </div>
                        <button
                          className={`badge ${apt.paid ? 'badge-success' : 'badge-warning'}`}
                          style={{ marginTop: '6px', border: 'none', cursor: 'pointer' }}
                          onClick={() => handleTogglePaid(apt.id)}
                          title="Clique para alternar"
                        >
                          {apt.paid ? '✓ Pago' : '○ Pendente'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ======================== VIEW: PENDÊNCIAS ======================== */}
      {view === 'pending' && (
        <>
          {/* Resumo geral */}
          {pendingGroups.length > 0 ? (
            <div className="pending-summary-card">
              <div className="pending-summary-label">Total em Aberto</div>
              <div className="pending-summary-amount">{formatCurrency(totalAllPending)}</div>
              <div className="pending-summary-sub">
                {pendingGroups.length} {pendingGroups.length === 1 ? 'paciente' : 'pacientes'} ·{' '}
                {allPending.length} {allPending.length === 1 ? 'atendimento' : 'atendimentos'}
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ marginTop: '16px' }}>
              <div className="empty-icon">✅</div>
              <div className="empty-text">Nenhuma pendência!</div>
              <div className="empty-subtext">Todos os atendimentos estão pagos</div>
            </div>
          )}

          {/* Cards por paciente */}
          <div className="card-list" style={{ marginTop: '12px' }}>
            {pendingGroups.map(group => (
              <div key={group.patientId} className="pending-patient-card">

                {/* Cabeçalho do paciente */}
                <div className="pending-patient-header">
                  <div className="pending-patient-info">
                    <div className="pending-patient-name">{getPatientName(group.patientId)}</div>
                    <div className="pending-patient-count">
                      {group.apts.length} {group.apts.length === 1 ? 'atendimento pendente' : 'atendimentos pendentes'}
                    </div>
                  </div>
                  <div className="pending-patient-total">{formatCurrency(group.total)}</div>
                </div>

                {/* Lista de atendimentos pendentes */}
                <div className="pending-apt-list">
                  {group.apts.map((apt, idx) => (
                    <div key={apt.id} className="pending-apt-row">
                      <div className="pending-apt-info">
                        <span className="pending-apt-date">{formatDate(apt.date)}</span>
                        <span className="pending-apt-time">{apt.time}</span>
                        {apt.serviceType && (
                          <span className="pending-apt-type">{apt.serviceType}</span>
                        )}
                        {apt.notes && apt.notes !== 'Avaliação' && (
                          <span className="pending-apt-notes">{apt.notes}</span>
                        )}
                        {(apt.appointmentType === 'avaliacao' || apt.notes === 'Avaliação') && (
                          <span className="pending-apt-avaliacao">Avaliação</span>
                        )}
                      </div>
                      <div className="pending-apt-right">
                        <span className="pending-apt-value">{formatCurrency(apt.value)}</span>
                        <button
                          className="pending-pay-btn"
                          onClick={() => handleTogglePaid(apt.id)}
                          title="Marcar como pago"
                        >
                          Pagar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Botão "Pagar todos" */}
                {group.apts.length > 1 && (
                  <div className="pending-mark-all">
                    <button
                      className="btn btn-sm pending-mark-all-btn"
                      onClick={() => handleMarkAllPaid(group.patientId)}
                    >
                      ✓ Quitar tudo — {formatCurrency(group.total)}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
