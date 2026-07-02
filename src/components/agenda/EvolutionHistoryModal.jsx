import React, { useState } from 'react'
import Modal from '../ui/Modal'
import { useApp } from '../../App'
import { exportEvolutionReportPDF } from '../../services/evolutionPdfExport'

const WDAY  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MONTH = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const dt = new Date(dateStr + 'T12:00:00')
  return `${WDAY[dt.getDay()]}, ${dt.getDate()} ${MONTH[dt.getMonth()]} ${dt.getFullYear()}`
}

export default function EvolutionHistoryModal({ appointments, patients, onClose }) {
  const { settings } = useApp()
  const [patientId, setPatientId] = useState('')
  const [exportError, setExportError] = useState('')

  // Pacientes que têm ao menos uma evolução registrada
  const patientsWithEvolution = patients
    .filter(p => appointments.some(a => a.patientId === p.id && a.evolution))
    .sort((a, b) => a.name.localeCompare(b.name))

  const evolutions = patientId
    ? appointments
        .filter(a => a.patientId === patientId && a.evolution)
        .sort((a, b) => b.date.localeCompare(a.date))
    : []

  async function handleExportPDF() {
    setExportError('')
    try {
      await exportEvolutionReportPDF(patientId, { patients, appointments, carimboText: settings.carimboText })
    } catch (err) {
      setExportError('Não foi possível gerar o PDF. Tente novamente.')
    }
  }

  return (
    <Modal title="Histórico de Evoluções" onClose={onClose}>

      {/* Seletor de paciente */}
      <div className="form-group">
        <label className="form-label">Paciente</label>
        {patientsWithEvolution.length === 0 ? (
          <p className="text-xs text-muted" style={{ marginTop: '4px' }}>
            Nenhuma evolução registrada no sistema ainda.
          </p>
        ) : (
          <select
            className="form-select"
            value={patientId}
            onChange={e => setPatientId(e.target.value)}
          >
            <option value="">Selecione um paciente</option>
            {patientsWithEvolution.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Estado vazio após seleção */}
      {patientId && evolutions.length === 0 && (
        <div className="empty-state" style={{ marginTop: '8px' }}>
          <div className="empty-icon">📋</div>
          <div className="empty-text">Nenhuma evolução registrada</div>
          <div className="empty-subtext">para este paciente</div>
        </div>
      )}

      {/* Lista de evoluções */}
      {evolutions.length > 0 && (
        <div className="evo-history-list">
          <div className="evo-history-count-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span>
              {evolutions.length} {evolutions.length === 1 ? 'registro' : 'registros'} encontrado{evolutions.length !== 1 ? 's' : ''}
            </span>
            <button className="btn btn-primary btn-sm" onClick={handleExportPDF}>
              Exportar PDF
            </button>
          </div>
          {exportError && <div className="alert-error" style={{ marginTop: '8px' }}>{exportError}</div>}

          {evolutions.map(apt => {
            const e = apt.evolution
            return (
              <div key={apt.id} className="evo-history-card">

                {/* Cabeçalho: data */}
                <div className="evo-history-date">
                  {formatDate(e.data || apt.date)}
                </div>

                {/* Sinais vitais */}
                <div className="evo-history-vitals">
                  <div className="evo-vital-row">
                    <span className="evo-vital-label">PA</span>
                    <div className="evo-vital-pair">
                      <span>Inicial: <strong>{e.paInicial}</strong></span>
                      <span className="evo-vital-sep">·</span>
                      <span>Final: <strong>{e.paFinal}</strong></span>
                    </div>
                  </div>
                  <div className="evo-vital-row">
                    <span className="evo-vital-label">SAT</span>
                    <div className="evo-vital-pair">
                      <span>Inicial: <strong>{e.satInicial}%</strong></span>
                      <span className="evo-vital-sep">·</span>
                      <span>Final: <strong>{e.satFinal}%</strong></span>
                    </div>
                  </div>
                  <div className="evo-vital-row">
                    <span className="evo-vital-label">FC</span>
                    <div className="evo-vital-pair">
                      <span>Inicial: <strong>{e.fcInicial} bpm</strong></span>
                      <span className="evo-vital-sep">·</span>
                      <span>Final: <strong>{e.fcFinal} bpm</strong></span>
                    </div>
                  </div>
                </div>

                {/* Evolução clínica */}
                {e.texto && (
                  <div className="evo-history-text">
                    <div className="evo-history-text-label">Evolução Clínica</div>
                    <p className="evo-history-text-body">{e.texto}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
