import React, { useState, useRef, useEffect } from 'react'
import { getTodayString } from '../../utils/helpers'

const DAY_ABBR   = ['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
const MONTH_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function getWeekDays(offset) {
  const today = new Date()
  const dow   = today.getDay()
  const diffToMon = dow === 0 ? -6 : 1 - dow
  const mon = new Date(today)
  mon.setDate(today.getDate() + diffToMon + offset * 7)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    const y  = d.getFullYear()
    const m  = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${dd}`
  })
}

function weekLabel(weekDays) {
  const [, fm, fd] = weekDays[0].split('-').map(Number)
  const [, lm, ld] = weekDays[6].split('-').map(Number)
  return fm === lm
    ? `${fd}–${ld} ${MONTH_ABBR[lm - 1]}`
    : `${fd} ${MONTH_ABBR[fm - 1]} – ${ld} ${MONTH_ABBR[lm - 1]}`
}

export default function WeeklyView({ appointments, patients, onEditApt }) {
  const [offset, setOffset] = useState(0)
  const gridRef = useRef(null)
  const today   = getTodayString()
  const weekDays = getWeekDays(offset)

  const getName = id => patients.find(p => p.id === id)?.name ?? 'Paciente'

  useEffect(() => {
    if (offset !== 0 || !gridRef.current) return
    const idx = weekDays.indexOf(today)
    if (idx >= 0) {
      gridRef.current.children[idx]?.scrollIntoView({ inline: 'center', behavior: 'smooth' })
    }
  }, []) // eslint-disable-line

  return (
    <div className="weekly-view">
      <div className="weekly-nav">
        <button className="month-btn" onClick={() => setOffset(o => o - 1)}>‹</button>
        <span className="weekly-nav-label">
          {offset === 0 ? 'Esta semana' : weekLabel(weekDays)}
        </span>
        <button className="month-btn" onClick={() => setOffset(o => o + 1)}>›</button>
      </div>

      {offset !== 0 && (
        <div className="weekly-today-row">
          <button className="history-month-chip active" onClick={() => setOffset(0)}>
            Semana atual
          </button>
        </div>
      )}

      <div className="weekly-grid" ref={gridRef}>
        {weekDays.map((date, i) => {
          const dd      = parseInt(date.split('-')[2])
          const isToday = date === today
          const apts    = appointments
            .filter(a => a.date === date)
            .sort((a, b) => a.time.localeCompare(b.time))

          return (
            <div key={date} className={`weekly-day${isToday ? ' weekly-day--today' : ''}`}>
              <div className="weekly-day-hd">
                <span className="weekly-day-name">{DAY_ABBR[i]}</span>
                <span className={`weekly-day-num${isToday ? ' weekly-day-num--today' : ''}`}>
                  {dd}
                </span>
              </div>

              <div className="weekly-day-body">
                {apts.length === 0
                  ? <span className="weekly-free">—</span>
                  : apts.map(apt => {
                      const isAval = apt.appointmentType === 'avaliacao' || apt.notes === 'Avaliação'
                      return (
                        <div
                          key={apt.id}
                          className={`weekly-apt weekly-apt--${apt.status}${apt.naoIniciouSessoes ? ' weekly-apt--warn' : ''}`}
                          onClick={() => onEditApt(apt)}
                        >
                          <div className="weekly-apt-time">{apt.time}</div>
                          <div className="weekly-apt-name">{getName(apt.patientId)}</div>
                          {isAval && <span className="weekly-apt-pill">Aval.</span>}
                          {apt.serviceType && (
                            <div className="weekly-apt-svc">{apt.serviceType}</div>
                          )}
                        </div>
                      )
                    })
                }
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
