import React, { useState } from 'react'
import Modal from '../ui/Modal'

export default function PatientForm({ patient, onSave, onClose }) {
  const isEditing = Boolean(patient)

  const [form, setForm] = useState({
    name:           patient?.name           || '',
    birthDate:      patient?.birthDate      || '',
    mainComplaint:  patient?.mainComplaint  || '',
    phone:          patient?.phone          || '',
    notes:       patient?.notes       || '',
    convenio:    patient?.convenio    || '',
    // Situação: 'ativo' | 'naoIniciou' | 'desistiu' — novos pacientes sempre ativos
    status:      patient?.active === false ? 'desistiu' : patient?.naoIniciou ? 'naoIniciou' : 'ativo',
  })
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
  }

  function handleSubmit() {
    if (!form.name.trim()) { setError('O nome é obrigatório'); return }
    if (!form.mainComplaint.trim())       { setError('A queixa principal é obrigatória'); return }
    const { status, ...rest } = form
    onSave({ ...rest, active: status !== 'desistiu', naoIniciou: status === 'naoIniciou' })
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
        <label className="form-label">Data de Nascimento</label>
        <input
          type="date"
          className="form-input"
          value={form.birthDate}
          onChange={e => set('birthDate', e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Queixa Principal *</label>
        <input
          type="text"
          className="form-input"
          placeholder="Ex: Dor pélvica crônica, incontinência urinária..."
          value={form.mainComplaint}
          onChange={e => set('mainComplaint', e.target.value)}
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
        <label className="form-label">Convênio</label>
        <select
          className="form-select"
          value={form.convenio}
          onChange={e => set('convenio', e.target.value)}
        >
          <option value="">Não informado</option>
          <option value="convenio">Convênio</option>
          <option value="particular">Particular</option>
        </select>
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

      {/* Situação — só exibida na edição, nunca na criação */}
      {isEditing && (
        <div className="patient-status-section">
          <div className="patient-status-divider" />
          <div className="patient-status-label">Situação do paciente</div>

          <div className="patient-status-toggle">
            <button
              type="button"
              className={`patient-status-btn patient-status-btn--ativo ${form.status === 'ativo' ? 'active' : ''}`}
              onClick={() => set('status', 'ativo')}
            >
              ✓ Ativo
            </button>
            <button
              type="button"
              className={`patient-status-btn patient-status-btn--nao-iniciou ${form.status === 'naoIniciou' ? 'active' : ''}`}
              onClick={() => set('status', 'naoIniciou')}
            >
              Não iniciou
            </button>
            <button
              type="button"
              className={`patient-status-btn patient-status-btn--inativo ${form.status === 'desistiu' ? 'active' : ''}`}
              onClick={() => set('status', 'desistiu')}
            >
              Desistiu
            </button>
          </div>

          {form.status === 'naoIniciou' && (
            <div className="patient-status-warning">
              Este paciente será movido para a seção "Não iniciaram sessões" na lista de pacientes.
            </div>
          )}
          {form.status === 'desistiu' && (
            <div className="patient-status-warning">
              Este paciente não aparecerá na lista de ativos nem no formulário de novo agendamento. O histórico de atendimentos é preservado.
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
