import React, { useState, useRef } from 'react'
import { getTodayString } from '../../utils/helpers'

const COLS = [
  { id: 'scheduled', label: 'Agendados',  color: '#f05deb' },
  { id: 'completed', label: 'Concluídos', color: '#10b981' },
  { id: 'cancelled', label: 'Cancelados', color: '#ef4444' },
]

const M = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const W = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

function localAddDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d + n)
  return [
    dt.getFullYear(),
    String(dt.getMonth() + 1).padStart(2, '0'),
    String(dt.getDate()).padStart(2, '0'),
  ].join('-')
}

function formatDay(dateStr) {
  const [, mo, d] = dateStr.split('-').map(Number)
  const dt = new Date(dateStr + 'T12:00:00')
  return `${W[dt.getDay()]}, ${d} ${M[mo - 1]}`
}

export default function DailyBoardView({ appointments, patients, onStatusChange, onEditApt }) {
  const today   = getTodayString()
  const [date, setDate] = useState(today)
  const [drag, setDrag] = useState(null)   // { aptId, x, y } | null
  const [over, setOver] = useState(null)   // coluna id sob o ponteiro
  const colRefs = useRef({})
  const dragRef = useRef(null)             // { aptId, srcStatus, startX, startY, started }

  const getName = id => patients.find(p => p.id === id)?.name ?? 'Paciente'
  const dayApts = appointments
    .filter(a => a.date === date)
    .sort((a, b) => a.time.localeCompare(b.time))

  function colAt(x, y) {
    return COLS.find(c => {
      const el = colRefs.current[c.id]
      if (!el) return false
      const r = el.getBoundingClientRect()
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
    })?.id ?? null
  }

  function onPointerDown(e, aptId, srcStatus) {
    e.preventDefault()
    dragRef.current = { aptId, srcStatus, startX: e.clientX, startY: e.clientY, started: false }

    function onMove(ev) {
      if (!dragRef.current) return
      const dx = Math.abs(ev.clientX - dragRef.current.startX)
      const dy = Math.abs(ev.clientY - dragRef.current.startY)
      if (!dragRef.current.started && dx + dy > 8) {
        dragRef.current.started = true
        setDrag({ aptId, x: ev.clientX, y: ev.clientY })
      } else if (dragRef.current.started) {
        setDrag(d => d ? { ...d, x: ev.clientX, y: ev.clientY } : null)
        setOver(colAt(ev.clientX, ev.clientY))
      }
    }

    function onUp(ev) {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      if (!dragRef.current) return
      if (!dragRef.current.started) {
        const apt = appointments.find(a => a.id === dragRef.current.aptId)
        if (apt) onEditApt(apt)
      } else {
        const col = colAt(ev.clientX, ev.clientY)
        if (col && col !== dragRef.current.srcStatus) {
          onStatusChange(dragRef.current.aptId, col)
        }
      }
      dragRef.current = null
      setDrag(null)
      setOver(null)
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const ghostApt = drag ? appointments.find(a => a.id === drag.aptId) : null

  return (
    <div className="board-view">
      {/* Navegação de data */}
      <div className="board-date-nav">
        <button className="month-btn" onClick={() => setDate(d => localAddDays(d, -1))}>‹</button>
        <div className="board-date-center">
          <span className="board-date-label">
            {date === today ? 'Hoje' : formatDay(date)}
          </span>
          {date !== today && (
            <button className="board-today-link" onClick={() => setDate(today)}>
              Ir para hoje
            </button>
          )}
        </div>
        <button className="month-btn" onClick={() => setDate(d => localAddDays(d, 1))}>›</button>
      </div>

      {/* Colunas Kanban */}
      <div className={`board-cols${drag ? ' board-cols--dragging' : ''}`}>
        {COLS.map(col => {
          const colApts = dayApts.filter(a => a.status === col.id)
          const isOver  = over === col.id && !!drag

          return (
            <div
              key={col.id}
              ref={el => { colRefs.current[col.id] = el }}
              className={`board-col${isOver ? ' board-col--over' : ''}`}
            >
              <div className="board-col-hd" style={{ borderTopColor: col.color }}>
                <span className="board-col-title">{col.label}</span>
                <span className="board-col-count" style={{ color: col.color }}>
                  {colApts.length}
                </span>
              </div>

              <div className="board-col-body">
                {isOver && drag && (
                  <div className="board-drop-hint">Soltar aqui ↓</div>
                )}
                {colApts.length === 0 && !isOver && (
                  <div className="board-col-empty">Nenhum</div>
                )}
                {colApts.map(apt => {
                  const isDragging = drag?.aptId === apt.id
                  const isAval     = apt.appointmentType === 'avaliacao' || apt.notes === 'Avaliação'
                  return (
                    <div
                      key={apt.id}
                      className={`board-card${isDragging ? ' board-card--dragging' : ''}${apt.naoIniciouSessoes ? ' board-card--warn' : ''}`}
                      onPointerDown={e => onPointerDown(e, apt.id, apt.status)}
                      style={{ touchAction: 'none', userSelect: 'none' }}
                    >
                      <div className="board-card-top">
                        <span className="board-card-time">{apt.time}</span>
                        {isAval && (
                          <span className="board-pill board-pill--aval">Aval.</span>
                        )}
                        {apt.naoIniciouSessoes && (
                          <span className="board-pill board-pill--warn">⚠ Não iniciou</span>
                        )}
                      </div>
                      <div className="board-card-name">{getName(apt.patientId)}</div>
                      {apt.serviceType && (
                        <div className="board-card-svc">{apt.serviceType}</div>
                      )}
                      {apt.notes && apt.notes !== 'Avaliação' && (
                        <div className="board-card-notes">{apt.notes}</div>
                      )}
                      <span className="board-card-grab">⠿</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Card flutuante durante drag */}
      {ghostApt && drag && (
        <div
          className="board-ghost"
          style={{ left: drag.x - 75, top: drag.y - 38 }}
          aria-hidden="true"
        >
          <div className="board-ghost-time">{ghostApt.time}</div>
          <div className="board-ghost-name">{getName(ghostApt.patientId)}</div>
        </div>
      )}
    </div>
  )
}
