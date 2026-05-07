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

  return (
    <div>
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
