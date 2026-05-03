import React, { useState } from 'react'
import Modal from '../ui/Modal'

export default function PatientForm({ patient, onSave, onClose }) {
  const [form, setForm] = useState({
    name:  patient?.name  || '',
    phone: patient?.phone || '',
    notes: patient?.notes || '',
  })
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError('O nome é obrigatório')
      return
    }
    onSave(form)
  }

  return (
    <Modal
      title={patient ? 'Editar Paciente' : 'Novo Paciente'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary btn-full" onClick={handleSubmit}>
            {patient ? 'Salvar' : 'Adicionar'}
          </button>
        </>
      }
    >
      {error && <div className="alert-error">{error}</div>}

      <div className="form-group">
        <label className="form-label">Nome *</label>
        <input
          type="text"
          className="form-input"
          placeholder="Nome completo"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label">Telefone</label>
        <input
          type="tel"
          className="form-input"
          placeholder="(00) 00000-0000"
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Observações</label>
        <textarea
          className="form-textarea"
          placeholder="Histórico, condições, anotações..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>
    </Modal>
  )
}
