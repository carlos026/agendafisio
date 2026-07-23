import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import * as patientService from './services/patientService'
import * as appointmentService from './services/appointmentService'
import * as settingsService from './services/settingsService'
import { onAuthChange } from './services/authService'
import Header from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import Dashboard from './components/dashboard/Dashboard'
import PatientsPage from './components/patients/PatientsPage'
import AgendaPage from './components/agenda/AgendaPage'
import FinancePage from './components/finance/FinancePage'
import SettingsPage from './components/settings/SettingsPage'
import ImportExportPage from './components/importexport/ImportExportPage'
import LoginPage from './components/auth/LoginPage'

// Contexto global — qualquer componente pode acessar pacientes e agendamentos
export const AppContext = createContext()

export function useApp() {
  return useContext(AppContext)
}

const PAGE_TITLES = {
  dashboard: 'Início',
  patients: 'Pacientes',
  agenda: 'Agenda',
  finance: 'Financeiro',
  settings:     'Configurações',
  importexport: 'Importar / Exportar',
}

export default function App() {
  const [page, setPage] = useState('dashboard')

  // Sessão de autenticação (Firebase Auth)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange(firebaseUser => {
      setUser(firebaseUser)
      setAuthLoading(false)
    })
    return unsubscribe
  }, [])

  // Carrega dados do localStorage na inicialização
  const [patients, setPatients] = useState(() => patientService.getAll())
  const [appointments, setAppointments] = useState(() => appointmentService.getAll())
  const [settings, setSettings] = useState(() => settingsService.getSettings())

  // Funções para re-sincronizar estado com localStorage após mutações
  const refreshPatients = useCallback(() => {
    setPatients(patientService.getAll())
  }, [])

  const refreshAppointments = useCallback(() => {
    setAppointments(appointmentService.getAll())
  }, [])

  const refreshSettings = useCallback(() => {
    setSettings(settingsService.getSettings())
  }, [])

  if (authLoading) {
    return <div className="login-page" />
  }

  if (!user) {
    return <LoginPage />
  }

  return (
    <AppContext.Provider value={{
      page,
      setPage,
      patients,
      appointments,
      settings,
      user,
      refreshPatients,
      refreshAppointments,
      refreshSettings,
    }}>
      <div className="app">
        <Header title={PAGE_TITLES[page]} userEmail={user.email} />

        <main className="main-content">
          {page === 'dashboard' && <Dashboard />}
          {page === 'patients'  && <PatientsPage />}
          {page === 'agenda'    && <AgendaPage />}
          {page === 'finance'   && <FinancePage />}
          {page === 'settings'      && <SettingsPage />}
          {page === 'importexport' && <ImportExportPage />}
        </main>

        <BottomNav />
      </div>
    </AppContext.Provider>
  )
}
