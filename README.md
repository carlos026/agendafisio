# Fisioterapia Pélvica — Sistema de Gestão

Sistema web PWA para gerenciar pacientes, agenda e controle financeiro de clínicas de fisioterapia pélvica. Desenvolvido mobile-first para uso em smartphone e tablet.

## Funcionalidades

### Pacientes
- Cadastro com nome, data de nascimento, queixa principal, telefone, observações e tipo de convênio (particular ou convênio)
- Inativação de pacientes desistentes (aparecem em cinza/opaco na agenda e no financeiro)
- Histórico de sessões vinculado ao paciente

### Agenda
- Agendamentos com status: **Agendado**, **Concluído**, **Cancelado**
- Tipo de atendimento por consulta: **Sessão** ou **Avaliação**
- Tipo de serviço configurável (ex.: Fisioterapia Pélvica, Pilates)
- Controle de sessões: número da sessão atual e total de sessões do paciente
- Identificação automática de Avaliação (1º atendimento de Fisioterapia Pélvica)
- Marcação de **"Não iniciou sessões"** para avaliações — destaque em laranja na agenda
- Filtros: Próximos, Hoje e Histórico (com filtro por mês)

#### Visualizações da Agenda
| Modo | Descrição |
|------|-----------|
| **Lista** | Visualização tradicional agrupada por data |
| **Semana** | Grade horizontal de 7 dias (Seg–Dom), navegação entre semanas, destaque do dia atual, scroll automático para hoje |
| **Board** | Kanban diário com 3 colunas (Agendados / Concluídos / Cancelados), drag & drop por toque ou mouse para mover status entre colunas |

#### Encontrar Horário Disponível
Busca inteligente de slots livres na agenda:
- Configuração de duração (30, 45, 60 ou 90 min) e período (hoje até 1 mês)
- Respeita horário de funcionamento (08:00–18:00), intervalo de almoço (12:00–13:00) e gap mínimo de 15 min entre atendimentos
- **Priorização automática** por preenchimento de lacunas: slots "sanduíche" (entre dois atendimentos) têm prioridade máxima, evitando fragmentação da agenda
- Botão "Agendar" em cada sugestão preenche data e hora no formulário automaticamente

### Evolução Clínica
- Registro de evolução por atendimento: pressão arterial (inicial/final, opcional), saturação (inicial/final) e frequência cardíaca (inicial/final), além do texto livre da evolução
- **Histórico de Evoluções**: modal com filtro por paciente, listando todas as evoluções registradas em ordem cronológica
- **Exportar PDF**: gera o *Relatório de Evolução* em PDF (`Relatorio_Evolucao_<Nome>.pdf`) a partir do histórico do paciente selecionado — cabeçalho com dados do paciente (idade calculada automaticamente, data de nascimento, queixa principal, data da avaliação) seguido de um bloco por evolução (data, nº do atendimento, sinais vitais, texto completo e carimbo do profissional), com paginação automática que nunca corta um bloco no meio da página

### Financeiro
- Controle de pagamentos por mês (recebidos e pendentes)
- Resumo do mês: total, recebido e a receber
- Identificação visual de pacientes inativos
- Filtro por mês com navegação

### Configurações
- Cadastro de tipos de atendimento com preços por convênio e particular
- Preenchimento automático do valor ao criar agendamento (baseado no tipo + convênio do paciente)
- Carimbo do Profissional (texto livre) usado na assinatura do Relatório de Evolução em PDF

### Importação e Exportação
- Exportação da agenda e dados de pacientes para **Excel (.xlsx)**
- Importação de planilha Excel para restaurar dados

## Tecnologias

- **React 18** + Vite 4
- **CSS puro** — mobile-first, sem biblioteca de UI
- **localStorage** — dados salvos localmente no dispositivo
- **vite-plugin-pwa** — instalável como app (PWA)
- **SheetJS (xlsx)** — importação e exportação de planilhas
- **jsPDF** — geração do Relatório de Evolução em PDF

## Pré-requisitos

- [Node.js 18+](https://nodejs.org)
- npm (já incluso no Node)

## Rodando localmente

```bash
# Instalar dependências
npm install

# Servidor de desenvolvimento
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
npm install -g vercel
vercel
```

Após o deploy, acesse a URL no Chrome Android e toque em **"Adicionar à tela inicial"** para instalar como app.

## Dados

Os dados ficam salvos no **localStorage do navegador** do dispositivo:

| Chave | Conteúdo |
|-------|----------|
| `fp_patients` | Lista de pacientes |
| `fp_appointments` | Lista de agendamentos |
| `fp_settings` | Configurações (tipos de atendimento, preços e carimbo do profissional) |

> Para backup manual: DevTools → Application → Local Storage → copiar os valores, ou usar a exportação para Excel disponível no sistema.

## Melhorias futuras

- [ ] Sincronização na nuvem (Firebase Firestore)
- [ ] Notificações de lembrete antes do agendamento
- [ ] Relatório financeiro em PDF
- [ ] Link direto para WhatsApp ao tocar no telefone do paciente
- [ ] Sugestão automática de retorno baseada na frequência do paciente
- [ ] Lista de espera inteligente com reagendamento automático
- [ ] Suporte a múltiplas profissionais com login
