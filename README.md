# Fisioterapia Pélvica — Micro Sistema de Controle e Gestão

Sistema web PWA para gerenciar pacientes, agenda e controle financeiro. Desenvolvido para uso em smartphone e tablet (mobile-first).

## Funcionalidades

- **Pacientes** — cadastro com nome, telefone e observações
- **Agenda** — agendamentos com status (Agendado, Concluído, Cancelado)
- **Financeiro** — controle de pagamentos por mês com resumo de recebidos e pendentes
- **Dashboard** — visão geral do dia e do mês atual

## Tecnologias

- React 18
- Vite 4
- CSS puro (mobile-first)
- localStorage (dados salvos no dispositivo)
- vite-plugin-pwa (instalável como app)

## Pré-requisitos

- [Node.js 18+](https://nodejs.org) — necessário para o build de produção
- npm (já vem com o Node)

## Rodando localmente

```bash
# Instalar dependências
npm install

# Iniciar servidor de desenvolvimento
npm run dev
# Acesse: http://localhost:5173

# Expor na rede local (para testar no celular via WiFi)
npm run dev -- --host
```

## Build de produção

```bash
npm run build
npm run preview   # visualizar o build antes de publicar
```

## Publicando no Vercel

```bash
# Instalar o CLI do Vercel (uma vez)
npm install -g vercel

# Publicar
vercel
```

Após o deploy, acesse a URL gerada no Chrome do Android e toque em **"Adicionar à tela inicial"** para instalar como app.

## Dados

Os dados ficam salvos no **localStorage do navegador** do dispositivo, em duas chaves:

`fp_patients`: Lista de pacientes
`fp_appointments`: Lista de agendamentos

> Para backup, exporte os dados manualmente via DevTools → Application → Local Storage.

## Melhorias futuras

- [ ] Sincronização na nuvem com Firebase Firestore
- [ ] Notificações de lembrete antes do agendamento
- [ ] Exportação de relatório financeiro em PDF
- [ ] Link direto para WhatsApp ao tocar no telefone do paciente
- [ ] Suporte a múltiplas profissionais com login
