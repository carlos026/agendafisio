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

// Cores das séries dos convênios personalizados no gráfico
const CUSTOM_CONVENIO_COLORS = ['#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#64748b']

export default function FinancePage() {
  const { patients, appointments, settings, refreshAppointments } = useApp()
  const customConvenios = settings?.customConvenios || []

  // ---- view principal: mês ou pendências ----
  const [view, setView] = useState('month')

  // ---- estado da view "Mês" ----
  const current = getCurrentMonth()
  const [year, setYear]     = useState(current.year)
  const [month, setMonth]   = useState(current.month)
  const [filter, setFilter] = useState('all')
  const [breakdownOpen, setBreakdownOpen] = useState(false)

  // ---- estado da view "Gráfico" ----
  const [chartYear, setChartYear] = useState(current.year)
  const [chartMode, setChartMode] = useState('status') // 'status' | 'type'

  // ---- dados da view "Mês" — apenas concluídos ----
  const monthApts   = getMonthAppointments(appointments, year, month)
  const activeApts  = monthApts.filter(a => a.status === 'completed')

  const totalReceived = activeApts.filter(a =>  a.paid).reduce((s, a) => s + a.value, 0)
  const totalPending  = activeApts.filter(a => !a.paid).reduce((s, a) => s + a.value, 0)
  const totalApts     = activeApts.length

  // Recebido e concluídos por tipo de paciente (particular / convênio)
  const convenioOf = (patientId) => patients.find(p => p.id === patientId)?.convenio || ''
  const breakdown = [
    { id: 'particular', label: 'Particular' },
    { id: 'convenio',   label: 'Convênio' },
    ...customConvenios.map(c => ({ id: c.id, label: c.name })),
    { id: '',           label: 'Não informado' },
  ]
    .map(group => {
      const apts = activeApts.filter(a => convenioOf(a.patientId) === group.id)
      return {
        ...group,
        completed: apts.length,
        received:  apts.filter(a => a.paid).reduce((s, a) => s + a.value, 0),
      }
    })
    // "Não informado" só aparece quando existir algum atendimento nele
    .filter(group => group.id !== '' || group.completed > 0)

  // ---- dados da view "Gráfico" — 12 meses do ano, apenas concluídos ----
  const CHART_SERIES = {
    status: [
      { key: 'received', label: 'Recebido',  color: 'var(--success)' },
      { key: 'pending',  label: 'A receber', color: 'var(--warning)' },
    ],
    type: [
      { key: 'particular', label: 'Particular', color: 'var(--primary)' },
      { key: 'convenio',   label: 'Convênio',   color: 'var(--primary-dark)' },
      ...customConvenios.map((c, i) => ({
        key: c.id, label: c.name, color: CUSTOM_CONVENIO_COLORS[i % CUSTOM_CONVENIO_COLORS.length],
      })),
    ],
  }
  const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  const chartSeries = CHART_SERIES[chartMode]
  const chartData = MONTH_SHORT.map((label, i) => {
    const apts = getMonthAppointments(appointments, chartYear, i + 1).filter(a => a.status === 'completed')
    const paid = apts.filter(a => a.paid)
    const sum = (list) => list.reduce((s, a) => s + a.value, 0)
    return {
      month: i + 1,
      label,
      received:   sum(paid),
      pending:    sum(apts.filter(a => !a.paid)),
      particular: sum(paid.filter(a => convenioOf(a.patientId) === 'particular')),
      convenio:   sum(paid.filter(a => convenioOf(a.patientId) === 'convenio')),
      ...Object.fromEntries(customConvenios.map(c => [
        c.id, sum(paid.filter(a => convenioOf(a.patientId) === c.id)),
      ])),
    }
  })
  const chartMax = Math.max(0, ...chartData.flatMap(d => chartSeries.map(s => d[s.key])))
  const chartTotals = chartSeries.map(s => ({ ...s, total: chartData.reduce((sum, d) => sum + d[s.key], 0) }))

  function openMonthFromChart(m) {
    setYear(chartYear)
    setMonth(m)
    setFilter('all')
    setView('month')
  }

  // ---- dados da view "Pendências" — concluídos e não pagos, todos os meses ----
  const allPending = appointments
    .filter(a => !a.paid && a.status === 'completed')
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
        <button
          className={`finance-view-btn ${view === 'chart' ? 'active' : ''}`}
          onClick={() => setView('chart')}
        >
          Gráfico
        </button>
      </div>

      {/* ======================== VIEW: GRÁFICO ======================== */}
      {view === 'chart' && (
        <>
          <div className="month-selector">
            <button className="month-btn" onClick={() => setChartYear(y => y - 1)}>‹</button>
            <span className="month-label">{chartYear}</span>
            <button className="month-btn" onClick={() => setChartYear(y => y + 1)}>›</button>
          </div>

          <div className="filter-tabs">
            {[
              { id: 'status', label: 'Recebido x A receber' },
              { id: 'type',   label: 'Particular x Convênio' },
            ].map(tab => (
              <button
                key={tab.id}
                className={`filter-tab ${chartMode === tab.id ? 'active' : ''}`}
                onClick={() => setChartMode(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="chart-card">
            <div className="chart-legend">
              {chartTotals.map(s => (
                <div key={s.key} className="chart-legend-item">
                  <span className="chart-legend-dot" style={{ background: s.color }} />
                  <div>
                    <div className="chart-legend-label">{s.label}</div>
                    <div className="chart-legend-total">{formatCurrency(s.total)}</div>
                  </div>
                </div>
              ))}
            </div>

            {chartMax === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📊</div>
                <div className="empty-text">Sem dados em {chartYear}</div>
              </div>
            ) : (
              <>
                <div className="chart-plot">
                  <div className="chart-axis">
                    <span>{formatCurrency(chartMax)}</span>
                    <span>{formatCurrency(chartMax / 2)}</span>
                    <span>0</span>
                  </div>
                  <div className="chart-bars">
                    <div className="chart-gridline" style={{ bottom: '100%' }} />
                    <div className="chart-gridline" style={{ bottom: '50%' }} />
                    {chartData.map((d, idx) => {
                      const selected = chartYear === year && d.month === month
                      return (
                        <button
                          key={d.month}
                          type="button"
                          className={`chart-col${selected ? ' selected' : ''}`}
                          onClick={() => openMonthFromChart(d.month)}
                          aria-label={`${d.label} de ${chartYear}: ${chartSeries
                            .map(s => `${s.label} ${formatCurrency(d[s.key])}`).join(', ')}. Abrir mês`}
                          title={chartSeries.map(s => `${s.label}: ${formatCurrency(d[s.key])}`).join('\n')}
                        >
                          <div className="chart-col-bars">
                            {chartSeries.map(s => (
                              <div
                                key={s.key}
                                className="chart-bar"
                                style={{
                                  height: `${(d[s.key] / chartMax) * 100}%`,
                                  minHeight: d[s.key] > 0 ? '3px' : 0,
                                  background: s.color,
                                  animationDelay: `${idx * 35}ms`, // cascata da esquerda para a direita
                                }}
                              />
                            ))}
                          </div>
                          <span className="chart-col-label">{d.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="chart-hint">Toque em um mês para ver os detalhes</div>
              </>
            )}
          </div>
        </>
      )}

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
                <div className="finance-stat-label">Concluídos</div>
                <div className="finance-stat-value">{totalApts}</div>
              </div>
            </div>
          </div>

          <div className={`finance-breakdown${breakdownOpen ? ' open' : ''}`}>
            <button
              type="button"
              className="finance-breakdown-toggle"
              onClick={() => setBreakdownOpen(o => !o)}
              aria-expanded={breakdownOpen}
            >
              <span className="finance-breakdown-toggle-text">
                <span className="finance-breakdown-toggle-title">Particular x Convênio</span>
                <span className="finance-breakdown-toggle-hint">
                  {breakdownOpen ? 'Toque para recolher' : 'Toque para ver detalhes'}
                </span>
              </span>
              <span className="finance-breakdown-chevron" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </button>

            <div className="finance-breakdown-body">
              <div className="finance-breakdown-grid">
                {breakdown.map(group => (
                  <div key={group.id || 'none'} className="finance-breakdown-card">
                    <div className="finance-breakdown-title">{group.label}</div>
                    <div className="finance-breakdown-row">
                      <span className="finance-breakdown-label">Recebido</span>
                      <span className="finance-breakdown-value">{formatCurrency(group.received)}</span>
                    </div>
                    <div className="finance-breakdown-row">
                      <span className="finance-breakdown-label">Concluídos</span>
                      <span className="finance-breakdown-value">{group.completed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="filter-tabs">
            {[
              { id: 'all',    label: 'Todos' },
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
                          {apt.serviceType && (
                            <span style={{ marginLeft: '6px' }}>· {apt.serviceType}</span>
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
