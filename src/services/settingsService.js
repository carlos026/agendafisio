import { KEYS, getObject, setItem } from './storageService'

const DEFAULTS = { convenioPrice: 0, particularPrice: 0, serviceTypes: [] }

export function getSettings() {
  return { ...DEFAULTS, ...getObject(KEYS.SETTINGS) }
}

export function saveSettings(data) {
  setItem(KEYS.SETTINGS, { ...getSettings(), ...data })
}
