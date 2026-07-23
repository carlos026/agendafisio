import React, { useState } from 'react'
import Modal from '../ui/Modal'
import * as storageService from '../../services/storageService'
import { exportToXLSX } from '../../services/excelExport'

const CONFIRM_WORD = 'LIMPAR'

export default function ClearDataModal({ patients, appointments, onClose, onCleared }) {
  const [confirmText, setConfirmText] = useState('')
  const [exportMsg, setExportMsg] = useState('')

  const canConfirm = confirmText.trim().toUpperCase() === CONFIRM_WORD

  function handleExportBackup() {
    try {
      const result = exportToXLSX('backup-antes-de-limpar')
      setExportMsg(`✓ Backup "${result.fileName}" baixado.`)
    } catch (err) {
      setExportMsg(`Erro ao gerar backup: ${err.message}`)
    }
  }

  function handleClear() {
    if (!canConfirm) return
    storageService.clearAll()
    onCleared()
  }

  return (
    <Modal
      title="Limpar Todos os Dados"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger btn-full" onClick={handleClear} disabled={!canConfirm}>
            Apagar Permanentemente
          </button>
        </>
      }
    >
      <div className="alert-error">
        Esta ação é <strong>irreversível</strong>. Todos os pacientes, agendamentos, evoluções clínicas e configurações
        serão apagados permanentemente deste dispositivo.
      </div>

      <div className="ie-preview-stats">
        <div className="ie-stat ie-stat--warn">
          <span className="ie-stat-num">{patients.length}</span>
          <span className="ie-stat-label">pacientes</span>
        </div>
        <div className="ie-stat ie-stat--warn">
          <span className="ie-stat-num">{appointments.length}</span>
          <span className="ie-stat-label">agendamentos</span>
        </div>
      </div>

      <button className="btn btn-outline btn-full" style={{ marginTop: '8px' }} onClick={handleExportBackup}>
        📥 Exportar backup antes de continuar
      </button>
      {exportMsg && (
        <div className={`ie-export-msg ${exportMsg.startsWith('Erro') ? 'ie-export-msg--error' : 'ie-export-msg--success'}`}>
          {exportMsg}
        </div>
      )}

      <div className="form-group" style={{ marginTop: '20px' }}>
        <label className="form-label">
          Para confirmar, digite <strong>{CONFIRM_WORD}</strong> abaixo:
        </label>
        <input
          type="text"
          className="form-input"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder={CONFIRM_WORD}
          autoFocus
        />
      </div>
    </Modal>
  )
}
