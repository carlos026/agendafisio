// Formata valor em Real brasileiro: R$ 150,00
export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

// Converte "2024-01-15" para "15/01/2024"
export function formatDate(dateStr) {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

// Retorna "maio de 2024"
export function formatMonthYear(year, month) {
  const date = new Date(year, month - 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

// Retorna as iniciais do nome: "Maria Silva" -> "MS"
export function getInitials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')
}

// Verifica se a data (YYYY-MM-DD) é hoje
export function isToday(dateStr) {
  return dateStr === getTodayString()
}

// Verifica se a data é amanhã
export function isTomorrow(dateStr) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return dateStr === tomorrow.toISOString().split('T')[0]
}

// Retorna "Hoje", "Amanhã" ou a data formatada
export function getRelativeDateLabel(dateStr) {
  if (isToday(dateStr)) return 'Hoje'
  if (isTomorrow(dateStr)) return 'Amanhã'
  return formatDate(dateStr)
}

// Retorna a data de hoje no formato "YYYY-MM-DD"
export function getTodayString() {
  return new Date().toISOString().split('T')[0]
}

// Retorna o ano e mês atuais
export function getCurrentMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

// Filtra agendamentos de um mês específico
export function getMonthAppointments(appointments, year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return appointments.filter(a => a.date.startsWith(prefix))
}
