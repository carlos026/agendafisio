// ===== Importação do localStorage para o Firestore =====
// Cópia única dos dados atuais (pacientes, agendamentos, configurações)
// para dentro de users/{uid}/... no Firestore, sob o usuário autenticado.
// O app continua funcionando no localStorage normalmente — isto só cria
// uma cópia sincronizada na nuvem.

import { writeBatch, doc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import * as patientService from './patientService'
import * as appointmentService from './appointmentService'
import * as settingsService from './settingsService'

const BATCH_LIMIT = 450

async function commitInChunks(setters) {
  for (let i = 0; i < setters.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db)
    setters.slice(i, i + BATCH_LIMIT).forEach(({ ref, data }) => batch.set(ref, data))
    await batch.commit()
  }
}

export async function importLocalDataToFirebase(uid) {
  const patients = patientService.getAll()
  const appointments = appointmentService.getAll()
  const settings = settingsService.getSettings()

  const setters = [
    ...patients.map(patient => ({ ref: doc(db, 'users', uid, 'patients', patient.id), data: patient })),
    ...appointments.map(appointment => ({ ref: doc(db, 'users', uid, 'appointments', appointment.id), data: appointment })),
  ]

  await commitInChunks(setters)
  await setDoc(doc(db, 'users', uid, 'settings', 'main'), settings)

  return {
    patientsImported: patients.length,
    appointmentsImported: appointments.length,
    settingsImported: true,
  }
}
