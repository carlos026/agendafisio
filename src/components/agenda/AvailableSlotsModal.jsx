import React, { useState } from 'react'
import Modal from '../ui/Modal'
import { findAvailableSlots } from '../../services/scheduleOptimizerService'

const DURATIONS = [
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 90, label: '90 min' },
]

const PERIODS = [
  { days: 1,  label: 'Hoje' },
  { days: 3,  label: '3 dias' },
  { days: 7,  label: '1 semana' },
  { days: 15, label: '15 dias' },
  { days: 30, label: '1 mês' },
]

const WDAY  = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado']
const MONTH = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatSlotDate(dateStr) {
  const dt  = new Date(dateStr + 'T12:00:00')
  const today = new Date(); today.setHours(12,0,0,0)
  const tom   = new Date(today); tom.setDate(today.getDate() + 1)
  if (dt.toDateString() === today.toDateString()) return 'Hoje'
  if (dt.toDateString() === tom.toDateString())   return 'Amanhã'
  return `${WDAY[dt.getDay()]}, ${dt.getDate()} ${MONTH[dt.getMonth()]}`
}

const REASON_ICON = {
  'Encaixa entre atendimentos':     '🎯',
  'Sequência de atendimento':       '⬆️',
  'Antes de atendimento existente': '⬇️',
  'Horário livre':                  '🕐',
}

export default function AvailableSlotsModal({ appointments, onSelect, onClose }) {
  const [duration, setDuration] = useState(60)
  const [days, setDays]         = useState(7)
  const [results, setResults]   = useState(null)

  function handleSearch() {
    const slots = findAvailableSlots(appointments, { duration, days })
    setResults(slots)
  }

  return (
    <Modal title="Encontrar Horário" onClose={onClose}>
      <div className="slots-params">
        <div className="slots-param-group">
          <span className="slots-param-label">Duração do atendimento</span>
          <div className="slots-chips">
            {DURATIONS.map(d => (
              <button
                key={d.value}
                type="button"
                className={`slots-chip${duration === d.value ? ' active' : ''}`}
                onClick={() => { setDuration(d.value); setResults(null) }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="slots-param-group">
          <span className="slots-param-label">Período a analisar</span>
          <div className="slots-chips">
            {PERIODS.map(p => (
              <button
                key={p.days}
                type="button"
                className={`slots-chip${days === p.days ? ' active' : ''}`}
                onClick={() => { setDays(p.days); setResults(null) }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-full slots-search-btn"
          onClick={handleSearch}
        >
          Buscar Horários
        </button>
      </div>

      {results !== null && (
        <div className="slots-results">
          {results.length === 0 ? (
            <div className="slots-empty">
              <div className="slots-empty-icon">😕</div>
              <div className="slots-empty-title">Nenhum horário disponível</div>
              <div className="slots-empty-sub">Tente um período maior ou duração menor</div>
            </div>
          ) : (
            <>
              <div className="slots-results-hd">
                {results.length} horário{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
              </div>
              {results.map((slot, i) => (
                <div key={`${slot.date}-${slot.time}`} className="slots-card">
                  <div className="slots-card-rank">#{i + 1}</div>
                  <div className="slots-card-info">
                    <div className="slots-card-date">{formatSlotDate(slot.date)}</div>
                    <div className="slots-card-time">{slot.time}</div>
                    <div className="slots-card-reason">
                      {REASON_ICON[slot.reason] || '💡'} {slot.reason}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm slots-card-btn"
                    onClick={() => onSelect(slot)}
                  >
                    Agendar
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
