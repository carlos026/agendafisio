import React, { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { getTodayString } from '../../utils/helpers'

export default function AppointmentForm({ appointment, patients, settings, onSave, onClose }) {
  const [form, setForm] = useState({
    patientId: appointment?.patientId || '',
    date:      appointment?.date      || getTodayString(),
    time:      appointment?.time      || '09:00',
    status:    appointment?.status    || 'scheduled',
    value:     appointment?.value?.toString() || '',
    paid:      appointment?.paid      || false,
    notes:     appointment?.notes     || '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (appointment || !form.patientId || !settings) return
    const patient = patients.find(p => p.id === form.patientId)
    if (!patient?.convenio) return
    const price = patient.convenio === 'convenio'
      ? settings.convenioPrice
      : settings.particularPrice
    if (price > 0) setForm(prev => ({ ...prev, value: price.toString() }))
  }, [form.patientId])

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  function handleSubmit() {
    if (!form.patientId) { setError('Selecione um paciente'); return }
    if (!form.date)      { setError('Informe a data'); return }
    if (!form.time)      { setError('Informe o horário'); return }
    onSave(form)
  }

  return (
    <Modal
      title={appointment ? 'Editar Agendamento' : 'Novo Agendamento'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost btn-full" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary btn-full" onClick={handleSubmit}>
            {appointment ? 'Salvar' : 'Agendar'}
          </button>
        </>
      }
    >
      {error && <div className="alert-error">{error}</div>}

      {/* Paciente */}
      <div className="form-group">
        <label className="form-label">Paciente *</label>
        <select
          className="form-select"
          value={form.patientId}
          onChange={e => set('patientId', e.target.value)}
        >
          <option value="">Selecione um paciente</option>
          {patients.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {patients.length === 0 && (
          <span className="text-xs text-muted">Cadastre um paciente primeiro</span>
        )}
      </div>

      {/* Data e Hora */}
      <div className="form-row">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Data *</label>
          <input
            type="date"
            className="form-input"
            value={form.date}
            onChange={e => set('date', e.target.value)}
          />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Horário *</label>
          <input
            type="time"
            className="form-input"
            value={form.time}
            onChange={e => set('time', e.target.value)}
          />
        </div>
      </div>

      {/* Status e Valor */}
      <div className="form-row" style={{ marginTop: '16px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Status</label>
          <select
            className="form-select"
            value={form.status}
            onChange={e => set('status', e.target.value)}
          >
            <option value="scheduled">Agendado</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Valor (R$)</label>
          <input
            type="number"
            className="form-input"
            placeholder="0,00"
            step="0.01"
            min="0"
            value={form.value}
            onChange={e => set('value', e.target.value)}
          />
        </div>
      </div>

      {/* Pagamento */}
      <div style={{ marginTop: '16px' }}>
        <label className="checkbox-group">
          <input
            type="checkbox"
            checked={form.paid}
            onChange={e => set('paid', e.target.checked)}
          />
          <span style={{ fontSize: '0.9rem', fontWeight: '500', color: 'var(--gray-700)' }}>
            Pagamento recebido
          </span>
        </label>
      </div>

      {/* Observações */}
      <div className="form-group" style={{ marginTop: '16px' }}>
        <label className="form-label">Observações</label>
        <textarea
          className="form-textarea"
          placeholder="Anotações sobre o atendimento..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>
    </Modal>
  )
}
