// Chaves usadas no localStorage
const KEYS = {
  PATIENTS: 'fp_patients',
  APPOINTMENTS: 'fp_appointments',
  SETTINGS: 'fp_settings',
}

function getItem(key) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function getObject(key) {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// Remove todos os dados do sistema do localStorage (pacientes, agendamentos, configurações)
function clearAll() {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key))
}

export { KEYS, getItem, getObject, setItem, clearAll }
