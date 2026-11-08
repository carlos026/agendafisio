import React, { useState } from 'react'
import Modal from '../ui/Modal'

const RESERVED = ['convênio', 'convenio', 'particular']

// Dialog de cadastro de convênio para um tipo de atendimento (nome + valor)
export default function ConvenioModal({ typeName, customConvenios, typeConvenioIds, onSave, onClose }) {
  const [name, setName]   = useState('')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const trimmed  = name.trim()
  const existing = customConvenios.find(c => c.name.toLowerCase() === trimmed.toLowerCase())
  const inThisType = existing && typeConvenioIds.includes(existing.id)

  function handleSubmit() {
    if (!trimmed) { setError('Informe o nome do convênio'); return }
    if (RESERVED.includes(trimmed.toLowerCase())) { setError('Esse nome já é usado por um convênio padrão'); return }
    const price = parseFloat(value)
    if (value === '' || Number.isNaN(price) || price < 0) { setError('Informe um valor válido'); return }
    onSave({ name: trimmed, value: price.toString() })
  }

  return (
    <Modal
      title="Novo Convênio"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary btn-full" onClick={handleSubmit}>
            {inThisType ? 'Atualizar valor' : 'Adicionar'}
          </button>
        </>
      }
    >
      {error && <div className="alert-error">{error}</div>}

      <div className="settings-info" style={{ marginTop: 0 }}>
        Tipo de atendimento: <strong>{typeName}</strong>
      </div>

      <div className="form-group">
        <label className="form-label">Nome *</label>
        <input
          type="text"
          className="form-input"
          placeholder="Ex: Unimed"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
        {existing && (
          <div className="text-xs text-muted" style={{ marginTop: '6px' }}>
            {inThisType
              ? 'Este convênio já existe neste tipo — o valor será atualizado.'
              : 'Este convênio já existe em outro tipo — será vinculado também a este, com o valor abaixo.'}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Valor (R$) *</label>
        <input
          type="number"
          className="form-input"
          placeholder="0,00"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={value}
          onChange={e => { setValue(e.target.value); setError('') }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
      </div>
    </Modal>
  )
}
