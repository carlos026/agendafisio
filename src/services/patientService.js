import { KEYS, getItem, setItem } from './storageService'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function getAll() {
  return getItem(KEYS.PATIENTS)
}

export function getById(id) {
  return getAll().find(p => p.id === id)
}

export function add(data) {
  const patients = getAll()
  const patient = {
    id: generateId(),
    name: data.name.trim(),
    phone: data.phone?.trim() || '',
    notes: data.notes?.trim() || '',
    convenio: data.convenio || '',
    createdAt: new Date().toISOString(),
  }
  setItem(KEYS.PATIENTS, [...patients, patient])
  return patient
}

export function update(id, data) {
  const patients = getAll().map(p =>
    p.id === id
      ? { ...p, name: data.name.trim(), phone: data.phone?.trim() || '', notes: data.notes?.trim() || '', convenio: data.convenio || '' }
      : p
  )
  setItem(KEYS.PATIENTS, patients)
}

export function remove(id) {
  setItem(KEYS.PATIENTS, getAll().filter(p => p.id !== id))
}
