import React, { useState } from 'react'
import Modal from '../ui/Modal'

export default function EvolutionModal({ appointment, patientName, onSave, onClose }) {
  const existing = appointment.evolution || {}

  const [form, setForm] = useState({
    data:       existing.data       || appointment.date,
    paInicial:  existing.paInicial  || '',
    paFinal:    existing.paFinal    || '',
    satInicial: existing.satInicial || '',
    satFinal:   existing.satFinal   || '',
    fcInicial:  existing.fcInicial  || '',
    fcFinal:    existing.fcFinal    || '',
    texto:      existing.texto      || '',
  })
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  function handleSubmit() {
    if (!form.data)              { setError('Informe a data'); return }
    if (!form.paInicial.trim())  { setError('Informe a Pressão Arterial Inicial'); return }
    if (!form.paFinal.trim())    { setError('Informe a Pressão Arterial Final'); return }
    if (!form.satInicial.trim()) { setError('Informe a SAT Inicial'); return }
    if (!form.satFinal.trim())   { setError('Informe a SAT Final'); return }
    if (!form.fcInicial.trim())  { setError('Informe a FC Inicial'); return }
    if (!form.fcFinal.trim())    { setError('Informe a FC Final'); return }
    if (!form.texto.trim())      { setError('Informe a Evolução Clínica'); return }
    onSave(form)
  }

  return (
    <Modal
      title="Evolução Clínica"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary btn-full" onClick={handleSubmit}>Salvar</button>
        </>
      }
    >
      {error && <div className="alert-error">{error}</div>}

      <div className="evolution-patient-label">
        Paciente: <strong>{patientName}</strong>
      </div>

      {/* Data */}
      <div className="form-group">
        <label className="form-label">Data *</label>
        <input
          type="date"
          className="form-input"
          value={form.data}
          onChange={e => set('data', e.target.value)}
        />
      </div>

      {/* Pressão Arterial */}
      <div className="evolution-section-label">Pressão Arterial (PA)</div>
      <div className="form-row">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Pressão Arterial Inicial</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: 120/80 mmHg"
            value={form.paInicial}
            onChange={e => set('paInicial', e.target.value)}
          />
         </div>
          <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Pressão Arterial Final</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: 130/90 mmHg"
            value={form.paFinal}
            onChange={e => set('paFinal', e.target.value)}
          />
         </div>
      </div>

      {/* Saturação */}
      <div className="evolution-section-label"  style={{ marginTop: '16px' }}>Saturação (SpO₂)</div>
      <div className="form-row">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">SAT Inicial (%) *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: 98"
            value={form.satInicial}
            onChange={e => set('satInicial', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">SAT Final (%) *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: 99"
            value={form.satFinal}
            onChange={e => set('satFinal', e.target.value)}
          />
        </div>
      </div>

      {/* Frequência Cardíaca */}
      <div className="evolution-section-label" style={{ marginTop: '16px' }}>Frequência Cardíaca</div>
      <div className="form-row">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">FC Inicial (bpm) *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: 70"
            value={form.fcInicial}
            onChange={e => set('fcInicial', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">FC Final (bpm) *</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: 75"
            value={form.fcFinal}
            onChange={e => set('fcFinal', e.target.value)}
          />
        </div>
      </div>

      {/* Evolução Clínica */}
      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">Evolução Clínica *</label>
        <textarea
          className="form-textarea"
          placeholder="Descreva a evolução clínica do paciente..."
          rows={5}
          value={form.texto}
          onChange={e => set('texto', e.target.value)}
        />
      </div>
    </Modal>
  )
}
