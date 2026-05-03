import React, { createContext, useContext, useState, useCallback } from 'react'
import * as patientService from './services/patientService'
import * as appointmentService from './services/appointmentService'
import Header from './components/layout/Header'
import BottomNav from './components/layout/BottomNav'
import Dashboard from './components/dashboard/Dashboard'
import PatientsPage from './components/patients/PatientsPage'
import AgendaPage from './components/agenda/AgendaPage'
import FinancePage from './components/finance/FinancePage'

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
}

export default function App() {
  const [page, setPage] = useState('dashboard')

  // Carrega dados do localStorage na inicialização
  const [patients, setPatients] = useState(() => patientService.getAll())
  const [appointments, setAppointments] = useState(() => appointmentService.getAll())

  // Funções para re-sincronizar estado com localStorage após mutações
  const refreshPatients = useCallback(() => {
    setPatients(patientService.getAll())
  }, [])

  const refreshAppointments = useCallback(() => {
    setAppointments(appointmentService.getAll())
  }, [])

  return (
    <AppContext.Provider value={{
      page,
      setPage,
      patients,
      appointments,
      refreshPatients,
      refreshAppointments,
    }}>
      <div className="app">
        <Header title={PAGE_TITLES[page]} />

        <main className="main-content">
          {page === 'dashboard' && <Dashboard />}
          {page === 'patients'  && <PatientsPage />}
          {page === 'agenda'    && <AgendaPage />}
          {page === 'finance'   && <FinancePage />}
        </main>

        <BottomNav />
      </div>
    </AppContext.Provider>
  )
}
