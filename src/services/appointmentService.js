import { KEYS, getItem, setItem } from './storageService'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function getAll() {
  return getItem(KEYS.APPOINTMENTS)
}

export function getById(id) {
  return getAll().find(a => a.id === id)
}

export function add(data) {
  const appointments = getAll()
  const appointment = {
    id: generateId(),
    patientId: data.patientId,
    serviceType: data.serviceType || '',
    totalSessions:  data.totalSessions  ? parseInt(data.totalSessions,  10) : null,
    sessionNumber:  data.sessionNumber  ? parseInt(data.sessionNumber,  10) : null,
    date: data.date,
    time: data.time,
    status: data.status || 'scheduled',
    value: parseFloat(data.value) || 0,
    paid: data.paid || false,
    notes: data.notes?.trim() || '',
    createdAt: new Date().toISOString(),
  }
  setItem(KEYS.APPOINTMENTS, [...appointments, appointment])
  return appointment
}

export function update(id, data) {
  const appointments = getAll().map(a =>
    a.id === id
      ? {
          ...a,
          patientId: data.patientId,
          serviceType: data.serviceType || '',
          totalSessions: data.totalSessions ? parseInt(data.totalSessions, 10) : null,
          sessionNumber: data.sessionNumber ? parseInt(data.sessionNumber, 10) : null,
          date: data.date,
          time: data.time,
          status: data.status,
          value: parseFloat(data.value) || 0,
          paid: data.paid,
          notes: data.notes?.trim() || '',
        }
      : a
  )
  setItem(KEYS.APPOINTMENTS, appointments)
}

export function remove(id) {
  setItem(KEYS.APPOINTMENTS, getAll().filter(a => a.id !== id))
}

// Alterna o status de pago/não pago de um agendamento
export function togglePaid(id) {
  const appointments = getAll().map(a =>
    a.id === id ? { ...a, paid: !a.paid } : a
  )
  setItem(KEYS.APPOINTMENTS, appointments)
}
