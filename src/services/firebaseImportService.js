// ===== Sincronização com o Firestore (localStorage ↔ Firebase) =====
// O app continua funcionando 100% no localStorage — este serviço só
// copia dados manualmente, numa direção por vez, sob o usuário autenticado:
//   importLocalDataToFirebase  — envia o localStorage deste dispositivo pro Firestore
//   downloadDataFromFirebase   — traz o Firestore pra dentro do localStorage deste dispositivo
// Não há sincronização automática/em tempo real — cada botão dispara uma cópia pontual.

import { writeBatch, doc, setDoc, collection, getDocs, getDoc } from 'firebase/firestore'
import { db } from './firebase'
import { KEYS, setItem as setLocalItem } from './storageService'
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

// ---- downloadDataFromFirebase ----
// Traz os dados do Firestore (users/{uid}/...) e SUBSTITUI o conteúdo atual
// do localStorage deste dispositivo. Usar ao entrar num dispositivo novo (ou
// para sincronizar com o que foi enviado de outro dispositivo). Qualquer dado
// local ainda não enviado ao Firebase é perdido — por isso a UI deve avisar
// antes de chamar isto.
export async function downloadDataFromFirebase(uid) {
  const patientsSnap = await getDocs(collection(db, 'users', uid, 'patients'))
  const appointmentsSnap = await getDocs(collection(db, 'users', uid, 'appointments'))
  const settingsSnap = await getDoc(doc(db, 'users', uid, 'settings', 'main'))

  const patients = patientsSnap.docs.map(d => d.data())
  const appointments = appointmentsSnap.docs.map(d => d.data())
  const settings = settingsSnap.exists() ? settingsSnap.data() : null

  setLocalItem(KEYS.PATIENTS, patients)
  setLocalItem(KEYS.APPOINTMENTS, appointments)
  if (settings) setLocalItem(KEYS.SETTINGS, settings)

  return {
    patientsDownloaded: patients.length,
    appointmentsDownloaded: appointments.length,
    settingsDownloaded: Boolean(settings),
  }
}
