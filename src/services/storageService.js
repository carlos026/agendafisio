// Chaves usadas no localStorage
const KEYS = {
  PATIENTS: 'fp_patients',
  APPOINTMENTS: 'fp_appointments',
}

function getItem(key) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export { KEYS, getItem, setItem }
