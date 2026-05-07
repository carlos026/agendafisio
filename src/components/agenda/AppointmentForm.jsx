import React, { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import { getTodayString } from '../../utils/helpers'

export default function AppointmentForm({ appointment, patients, appointments, settings, onSave, onClose }) {
  const serviceTypes = settings?.serviceTypes || []

  const [form, setForm] = useState({
    patientId:     appointment?.patientId     || '',
    serviceType:   appointment?.serviceType   || '',
    totalSessions: appointment?.totalSessions?.toString() || '',
    sessionNumber: appointment?.sessionNumber?.toString() || '',
    date:          appointment?.date          || getTodayString(),
    time:          appointment?.time          || '09:00',
    status:        appointment?.status        || 'scheduled',
    value:         appointment?.value?.toString() || '',
    paid:          appointment?.paid          || false,
    notes:         appointment?.notes         || '',
  })
  const [error, setError] = useState('')

  const hasTotalSessions = form.totalSessions.trim() !== ''

  // Auto-preenche valor (convênio) ao trocar paciente
  useEffect(() => {
    if (appointment || !form.patientId || !settings) return
    const patient = patients.find(p => p.id === form.patientId)
    if (!patient?.convenio) return
    const price = patient.convenio === 'convenio'
      ? settings.convenioPrice
      : settings.particularPrice
    if (price > 0) setForm(prev => ({ ...prev, value: price.toString() }))
  }, [form.patientId])

  // Auto-preenche sessionNumber quando patientId ou totalSessions muda (só em criação)
  useEffect(() => {
    if (appointment) return
    if (!form.patientId || !hasTotalSessions) {
      setForm(prev => ({ ...prev, sessionNumber: '' }))
      return
    }
    const pastCount = (appointments || []).filter(
      a => a.patientId === form.patientId && a.status !== 'cancelled'
    ).length
    setForm(prev => ({ ...prev, sessionNumber: (pastCount + 1).toString() }))
  }, [form.patientId, hasTotalSessions])

  function countPastAppointments(patientId) {
    return (appointments || []).filter(
      a => a.patientId === patientId && a.status !== 'cancelled'
    ).length
  }

  function set(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value }

      if (!appointment) {
        const patientId    = field === 'patientId'   ? value : prev.patientId
        const serviceType  = field === 'serviceType' ? value : prev.serviceType

        if (serviceType === 'Fisioterapia Pélvica' && patientId) {
          if (countPastAppointments(patientId) === 0) {
            next.notes = 'Avaliação'
          }
        } else if (
          (field === 'serviceType' && value !== 'Fisioterapia Pélvica') ||
          (field === 'patientId')
        ) {
          // Limpa o auto-fill se mudar de tipo ou de paciente
          if (prev.notes === 'Avaliação') next.notes = ''
        }
      }

      return next
    })
    setError('')
  }

  function handleSubmit() {
    if (!form.patientId)                         { setError('Selecione um paciente'); return }
    if (!form.serviceType)                       { setError('Selecione o tipo de atendimento'); return }
    if (hasTotalSessions && !form.sessionNumber) { setError('Informe o número da sessão'); return }
    if (!form.date)                              { setError('Informe a data'); return }
    if (!form.time)                              { setError('Informe o horário'); return }
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

      {/* Tipo de Atendimento */}
      <div className="form-group">
        <label className="form-label">Tipo de Atendimento *</label>
        {serviceTypes.length === 0 ? (
          <span className="text-xs text-muted">
            Cadastre tipos de atendimento em Configurações antes de agendar
          </span>
        ) : (
          <select
            className="form-select"
            value={form.serviceType}
            onChange={e => set('serviceType', e.target.value)}
          >
            <option value="">Selecione o tipo</option>
            {serviceTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        )}
      </div>

      {/* Qtd. de Sessões + Sessão */}
      <div className="form-row">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Qtd. de Sessões</label>
          <input
            type="number"
            className="form-input"
            placeholder="Ex: 10"
            min="1"
            step="1"
            value={form.totalSessions}
            onChange={e => set('totalSessions', e.target.value)}
          />
        </div>
        {hasTotalSessions && (
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Sessão *</label>
            <input
              type="number"
              className="form-input"
              placeholder="Ex: 1"
              min="1"
              step="1"
              value={form.sessionNumber}
              onChange={e => set('sessionNumber', e.target.value)}
            />
          </div>
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
