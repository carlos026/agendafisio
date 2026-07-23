import React from 'react'
import { signOutUser } from '../../services/authService'

export default function Header({ title, userEmail }) {
  return (
    <header className="header">
      <div>
        <div className="header-title">{title}</div>
        <div className="header-subtitle">Fisioterapia Pélvica</div>
      </div>
      {userEmail && (
        <button className="header-logout-btn" onClick={signOutUser} title={`Sair (${userEmail})`}>
          Sair
        </button>
      )}
    </header>
  )
}
