import React from 'react'

export default function Header({ title }) {
  return (
    <header className="header">
      <div>
        <div className="header-title">{title}</div>
        <div className="header-subtitle">Fisioterapia Pélvica</div>
      </div>
    </header>
  )
}
