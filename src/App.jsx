import React, { createContext, useContext, useState, useCallback } from 'react'
import * as patientService from './services/patientService'
import * as appointmentService from './services/appointmentService'
import * as settingsService from './services/settingsService'
import Header from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import Dashboard from './components/dashboard/Dashboard'
import PatientsPage from './components/patients/PatientsPage'
import AgendaPage from './components/agenda/AgendaPage'
import FinancePage from './components/finance/FinancePage'
import SettingsPage from './components/settings/SettingsPage'

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
  settings: 'Configurações',
}

export default function App() {
  const [page, setPage] = useState('dashboard')

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

  return (
    <AppContext.Provider value={{
      page,
      setPage,
      patients,
      appointments,
      settings,
      refreshPatients,
      refreshAppointments,
      refreshSettings,
    }}>
      <div className="app">
        <Header title={PAGE_TITLES[page]} />

        <main className="main-content">
          {page === 'dashboard' && <Dashboard />}
          {page === 'patients'  && <PatientsPage />}
          {page === 'agenda'    && <AgendaPage />}
          {page === 'finance'   && <FinancePage />}
          {page === 'settings'  && <SettingsPage />}
        </main>

        <BottomNav />
      </div>
    </AppContext.Provider>
  )
}
