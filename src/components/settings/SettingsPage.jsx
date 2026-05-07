import React, { useState } from 'react'
import * as settingsService from '../../services/settingsService'
import { useApp } from '../../App'

export default function SettingsPage() {
  const { refreshSettings } = useApp()
  const initial = settingsService.getSettings()

  const [form, setForm] = useState({
    convenioPrice:  initial.convenioPrice.toString(),
    particularPrice: initial.particularPrice.toString(),
  })
  const [saved, setSaved] = useState(false)

  const [serviceTypes, setServiceTypes] = useState(initial.serviceTypes || [])
  const [newType, setNewType] = useState('')
  const [typeError, setTypeError] = useState('')

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    setSaved(false)
  }

  function handleSave() {
    settingsService.saveSettings({
      convenioPrice:  parseFloat(form.convenioPrice)  || 0,
      particularPrice: parseFloat(form.particularPrice) || 0,
    })
    refreshSettings()
    setSaved(true)
  }

  function handleAddType() {
    const trimmed = newType.trim()
    if (!trimmed) { setTypeError('Informe um nome para o tipo'); return }
    if (serviceTypes.includes(trimmed)) { setTypeError('Esse tipo já existe'); return }
    const updated = [...serviceTypes, trimmed]
    setServiceTypes(updated)
    settingsService.saveSettings({ serviceTypes: updated })
    refreshSettings()
    setNewType('')
    setTypeError('')
  }

  function handleRemoveType(type) {
    const updated = serviceTypes.filter(t => t !== type)
    setServiceTypes(updated)
    settingsService.saveSettings({ serviceTypes: updated })
    refreshSettings()
  }

  return (
    <div>
      {/* Tipos de Atendimento */}
      <div className="settings-section">
        <h2 className="settings-title">Tipos de Atendimento</h2>
        <p className="settings-description">
          Os tipos cadastrados aqui aparecem como opção obrigatória ao criar um agendamento.
        </p>

        {serviceTypes.length > 0 && (
          <ul className="service-type-list">
            {serviceTypes.map(type => (
              <li key={type} className="service-type-item">
                <span className="service-type-label">{type}</span>
                <button
                  className="service-type-remove"
                  onClick={() => handleRemoveType(type)}
                  title="Remover"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {serviceTypes.length === 0 && (
          <p className="text-xs text-muted" style={{ marginBottom: '12px' }}>
            Nenhum tipo cadastrado ainda.
          </p>
        )}

        <div className="service-type-add">
          <input
            type="text"
            className="form-input"
            placeholder="Ex: Fisioterapia Pélvica"
            value={newType}
            onChange={e => { setNewType(e.target.value); setTypeError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAddType()}
          />
          <button className="btn btn-primary" onClick={handleAddType}>
            Adicionar
          </button>
        </div>
        {typeError && <div className="alert-error" style={{ marginTop: '8px' }}>{typeError}</div>}
      </div>

      {/* Valores por convênio */}
      <div className="settings-section">
        <h2 className="settings-title">Valores padrão por convênio</h2>
        <p className="settings-description">
          Ao criar um agendamento, o valor será preenchido automaticamente com base no convênio do paciente.
        </p>

        <div className="settings-info">
          As alterações feitas aqui se aplicam apenas a novos agendamentos. Registros anteriores não são afetados.
        </div>

        <div className="form-group" style={{ marginTop: '24px' }}>
          <label className="form-label">Valor padrão — Convênio (R$)</label>
          <input
            type="number"
            className="form-input"
            placeholder="0,00"
            step="0.01"
            min="0"
            value={form.convenioPrice}
            onChange={e => set('convenioPrice', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Valor padrão — Particular (R$)</label>
          <input
            type="number"
            className="form-input"
            placeholder="0,00"
            step="0.01"
            min="0"
            value={form.particularPrice}
            onChange={e => set('particularPrice', e.target.value)}
          />
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSave}>
          Salvar configurações
        </button>

        {saved && (
          <div className="settings-success">
            Configurações salvas com sucesso!
          </div>
        )}
      </div>
    </div>
  )
}
