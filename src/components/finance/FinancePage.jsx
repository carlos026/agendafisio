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

  const current = getCurrentMonth()
  const [year, setYear]   = useState(current.year)
  const [month, setMonth] = useState(current.month)
  const [filter, setFilter] = useState('all')

  // Agendamentos do mês selecionado (exceto cancelados para fins financeiros)
  const monthApts = getMonthAppointments(appointments, year, month)
  const activeApts = monthApts.filter(a => a.status !== 'cancelled')

  const totalReceived  = activeApts.filter(a => a.paid).reduce((s, a) => s + a.value, 0)
  const totalPending   = activeApts.filter(a => !a.paid).reduce((s, a) => s + a.value, 0)
  const totalApts      = activeApts.length
  const completedCount = activeApts.filter(a => a.status === 'completed').length

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

  const getPatientName = (id) => {
    const p = patients.find(p => p.id === id)
    return p ? p.name : 'Paciente removido'
  }

  // Filtra a lista conforme aba selecionada e ordena por data
  let filtered = [...activeApts]
  if (filter === 'paid')    filtered = filtered.filter(a => a.paid)
  if (filter === 'pending') filtered = filtered.filter(a => !a.paid)
  filtered.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))

  return (
    <div>
      {/* Seletor de mês */}
      <div className="month-selector">
        <button className="month-btn" onClick={prevMonth}>‹</button>
        <span className="month-label">{formatMonthYear(year, month)}</span>
        <button className="month-btn" onClick={nextMonth}>›</button>
      </div>

      {/* Card de resumo financeiro */}
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

      {/* Abas de filtro */}
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

      {/* Lista de atendimentos */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <div className="empty-text">Nenhum atendimento neste período</div>
        </div>
      ) : (
        <div className="card-list">
          {filtered.map(apt => (
            <div key={apt.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                {/* Info do paciente e data */}
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

                {/* Valor e botão de pagamento */}
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
          ))}
        </div>
      )}
    </div>
  )
}
