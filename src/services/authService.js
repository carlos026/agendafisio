// ===== Autenticação (Firebase Auth) =====
// Sem cadastro público — a conta da fisioterapeuta é criada manualmente
// no Console do Firebase (Authentication → Users → Add user).

import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth'
import { auth, firebaseReady } from './firebase'

export function signIn(email, password) {
  if (!firebaseReady) return Promise.reject(new Error('Firebase não configurado (veja .env.example)'))
  return signInWithEmailAndPassword(auth, email, password)
}

export function signOutUser() {
  if (!firebaseReady) return Promise.resolve()
  return signOut(auth)
}

// Se o Firebase ainda não foi configurado, reporta "sem usuário" em vez de
// travar o app — a tela de login mostra o aviso de configuração pendente.
export function onAuthChange(callback) {
  if (!firebaseReady) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}
