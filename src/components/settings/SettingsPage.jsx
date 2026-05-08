import React, { useState } from 'react'
import * as settingsService from '../../services/settingsService'
import { useApp } from '../../App'

function normalizeTypes(raw) {
  return (raw || []).map(t =>
    typeof t === 'string'
      ? { name: t, convenioPrice: '', particularPrice: '' }
      : { ...t, convenioPrice: t.convenioPrice > 0 ? t.convenioPrice.toString() : '', particularPrice: t.particularPrice > 0 ? t.particularPrice.toString() : '' }
  )
}

function serializeTypes(types) {
  return types.map(t => ({
    name: t.name,
    convenioPrice:  parseFloat(t.convenioPrice)  || 0,
    particularPrice: parseFloat(t.particularPrice) || 0,
  }))
}

export default function SettingsPage() {
  const { refreshSettings } = useApp()
  const initial = settingsService.getSettings()

  const [serviceTypes, setServiceTypes] = useState(() => normalizeTypes(initial.serviceTypes))
  const [newType, setNewType] = useState('')
  const [typeError, setTypeError] = useState('')

  function persist(types) {
    settingsService.saveSettings({ serviceTypes: serializeTypes(types) })
    refreshSettings()
  }

  function handleAddType() {
    const trimmed = newType.trim()
    if (!trimmed) { setTypeError('Informe um nome para o tipo'); return }
    if (serviceTypes.some(t => t.name === trimmed)) { setTypeError('Esse tipo já existe'); return }
    const updated = [...serviceTypes, { name: trimmed, convenioPrice: '', particularPrice: '' }]
    setServiceTypes(updated)
    persist(updated)
    setNewType('')
    setTypeError('')
  }

  function handleRemoveType(index) {
    const updated = serviceTypes.filter((_, i) => i !== index)
    setServiceTypes(updated)
    persist(updated)
  }

  function handlePriceChange(index, field, value) {
    setServiceTypes(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  function handlePriceBlur() {
    setServiceTypes(prev => {
      persist(prev)
      return prev
    })
  }

  return (
    <div>
      <div className="settings-section">
        <h2 className="settings-title">Tipos de Atendimento</h2>
        <p className="settings-description">
          Defina os tipos e seus valores padrão por convênio. O valor é preenchido automaticamente ao criar um agendamento.
        </p>

        <div className="settings-info">
          As alterações de preço se aplicam apenas a novos agendamentos. Registros anteriores não são afetados.
        </div>

        {serviceTypes.length > 0 && (
          <ul className="service-type-list" style={{ marginTop: '16px' }}>
            {serviceTypes.map((type, index) => (
              <li key={type.name} className="service-type-item service-type-item--with-prices">
                <div className="service-type-header">
                  <span className="service-type-label">{type.name}</span>
                  <button
                    className="service-type-remove"
                    onClick={() => handleRemoveType(index)}
                    title="Remover"
                  >
                    ✕
                  </button>
                </div>
                <div className="service-type-prices">
                  <div>
                    <div className="service-type-price-label">Convênio (R$)</div>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0,00"
                      step="0.01"
                      min="0"
                      value={type.convenioPrice}
                      onChange={e => handlePriceChange(index, 'convenioPrice', e.target.value)}
                      onBlur={() => handlePriceBlur(index)}
                    />
                  </div>
                  <div>
                    <div className="service-type-price-label">Particular (R$)</div>
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0,00"
                      step="0.01"
                      min="0"
                      value={type.particularPrice}
                      onChange={e => handlePriceChange(index, 'particularPrice', e.target.value)}
                      onBlur={() => handlePriceBlur(index)}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {serviceTypes.length === 0 && (
          <p className="text-xs text-muted" style={{ margin: '16px 0 12px' }}>
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
    </div>
  )
}
