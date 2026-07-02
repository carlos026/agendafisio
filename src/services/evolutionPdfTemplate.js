// ===== Template do Relatório de Evolução (jsPDF) =====
// Desenho manual (retângulos/linhas/texto) para reproduzir fielmente o
// layout do modelo fornecido: banner de título, cabeçalho do paciente
// (uma vez, página 1) e um bloco repetido por evolução (data/nº do
// atendimento, sinais vitais, texto da evolução e carimbo do profissional).

import { jsPDF } from 'jspdf'
import reportLogoUrl from '../assets/report-logo.png'

// ---- Layout (A4 retrato, mm) ----
const PAGE_W = 210
const PAGE_H = 297
const MARGIN = 15
const CONTENT_W = PAGE_W - MARGIN * 2
const PAGE_BOTTOM = PAGE_H - MARGIN

// ---- Cores (placeholder — ajustar para o tom exato do modelo se necessário) ----
const BANNER_FILL = [255, 255, 255]
const BANNER_BORDER = [55, 45, 40]
const BOX_FILL = [232, 226, 217]
const BORDER_COLOR = [60, 55, 50]
const TEXT_COLOR = [25, 22, 20]

const LINE_HEIGHT = 4.6
const MIN_TEXT_LINES = 5
const BLOCK_GAP = 9

// ---- Utilitário: garante espaço na página atual, senão adiciona nova ----
function ensureSpace(doc, y, neededHeight) {
  if (y + neededHeight > PAGE_BOTTOM) {
    doc.addPage()
    return MARGIN
  }
  return y
}

// ---- Converte a URL de um asset importado (Vite) em data URL base64 ----
// Necessário porque jsPDF#addImage não aceita URLs de arquivo diretamente.
async function loadImageAsDataURL(url) {
  const response = await fetch(url)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function loadReportLogo() {
  return loadImageAsDataURL(reportLogoUrl)
}

// ---- Banner de título ----
const BANNER_ICON_SIZE = 25

function drawBanner(doc, x, y, width, opts = {}) {
  const height = 22
  doc.setFillColor(...BANNER_FILL)
  doc.setDrawColor(...BANNER_BORDER)
  doc.setLineWidth(0.6)
  doc.roundedRect(x, y, width, height, 4, 4, 'FD')

  if (opts.iconDataUrl) {
    doc.addImage(opts.iconDataUrl, 'PNG', x + 45, y+2 + (height - BANNER_ICON_SIZE) / 2, BANNER_ICON_SIZE, BANNER_ICON_SIZE)
  }

  doc.setTextColor(...TEXT_COLOR)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(18)
  doc.text('Relatório de Evolução', x+10 + width / 2, y + 10, { align: 'center' })
  doc.setFontSize(13)
  doc.text('Fisioterapia Pélvica', x+10 + width / 2, y + 17.5, { align: 'center' })

  return y + height
}

// ---- Campo rotulado (label acima de caixa preenchida com o valor) ----
function drawLabeledBox(doc, x, y, width, label, value) {
  doc.setTextColor(...TEXT_COLOR)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.text(label, x, y + 3.5)

  const boxY = y + 5
  const boxH = 7
  doc.setFillColor(...BOX_FILL)
  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(0.25)
  doc.rect(x, boxY, width, boxH, 'FD')

  doc.setFontSize(9.5)
  doc.text(value || '', x + 2.5, boxY + 4.8)

  return y + 5 + boxH + 4
}

// ---- Cabeçalho do paciente (uma vez, página 1) ----
function drawPatientHeader(doc, x, y, width, patient) {
  const colGap = 10
  const colW = (width - colGap) / 2
  const leftX = x
  const rightX = x + colW + colGap

  let leftY = y
  let rightY = y

  leftY = drawLabeledBox(doc, leftX, leftY, colW, 'Paciente:', patient.name)
  rightY = drawLabeledBox(doc, rightX, rightY, colW, 'Data de Nascimento:', patient.birthDateLabel)

  leftY = drawLabeledBox(doc, leftX, leftY, colW, 'Idade:', patient.ageLabel)
  rightY = drawLabeledBox(doc, rightX, rightY, colW, 'Queixa Principal:', patient.mainComplaintLabel)

  leftY = drawLabeledBox(doc, leftX, leftY, colW, 'Data da Avaliação:', patient.avaliacaoDateLabel)

  return Math.max(leftY, rightY) + 2
}

// ---- Linha "Data" + "Nº do Atendimento" (por bloco de evolução) ----
const DATA_LABEL_W = 45
const DATA_VALUE_W = 45
const ATEND_LABEL_W = 45
const ROW_H = 8

function drawDataSessionRow(doc, x, y, width, evolution) {
  const atendValueW = width - DATA_LABEL_W - DATA_VALUE_W - ATEND_LABEL_W

  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(0.25)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)

  // Célula "Data"
  doc.setFillColor(...BOX_FILL)
  doc.rect(x, y, DATA_LABEL_W, ROW_H, 'FD')
  doc.setTextColor(...TEXT_COLOR)
  doc.text('Data', x + DATA_LABEL_W / 2, y + ROW_H / 2 + 1.2, { align: 'center' })

  // Valor da data
  let cx = x + DATA_LABEL_W
  doc.setFillColor(255, 255, 255)
  doc.rect(cx, y, DATA_VALUE_W, ROW_H, 'FD')
  doc.setFont('helvetica', 'normal')
  doc.text(evolution.dateLabel || '', cx + DATA_VALUE_W / 2, y + ROW_H / 2 + 1.2, { align: 'center' })

  // Célula "Nº do Atendimento"
  cx += DATA_VALUE_W
  doc.setFillColor(...BOX_FILL)
  doc.setFont('helvetica', 'bold')
  doc.rect(cx, y, ATEND_LABEL_W, ROW_H, 'FD')
  doc.text('Nº do Atendimento', cx + ATEND_LABEL_W / 2, y + ROW_H / 2 + 1.2, { align: 'center' })

  // Valor do nº do atendimento
  cx += ATEND_LABEL_W
  doc.setFillColor(255, 255, 255)
  doc.setFont('helvetica', 'normal')
  doc.rect(cx, y, atendValueW, ROW_H, 'FD')
  doc.text(evolution.sessionLabel || '', cx + atendValueW / 2, y + ROW_H / 2 + 1.2, { align: 'center' })

  return y + ROW_H
}

// ---- Tabela de sinais vitais (PA / Saturação / FC) ----
const GROUP_W = CONTENT_W / 3
const GROUP_LABEL_W = 20
const GROUP_SUBLABEL_W = 16
const GROUP_VALUE_W = GROUP_W - GROUP_LABEL_W - GROUP_SUBLABEL_W
const VITAL_ROW_H = 6

function drawVitalsGroup(doc, x, y, title, inicialValue, finalValue) {
  doc.setDrawColor(...BORDER_COLOR)
  doc.setLineWidth(0.25)

  // Label do grupo (spans as 2 linhas)
  doc.setFillColor(...BOX_FILL)
  doc.rect(x, y, GROUP_LABEL_W, VITAL_ROW_H * 2, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.3)
  doc.setTextColor(...TEXT_COLOR)
  const titleLines = doc.splitTextToSize(title, GROUP_LABEL_W - 2)
  const titleStartY =  title.length > 10 ? y+2 + VITAL_ROW_H - (titleLines.length - 1) * 2.6 : y + VITAL_ROW_H - (titleLines.length - 1) * 2.6
  titleLines.forEach((line, i) => {
    doc.text(line, x + GROUP_LABEL_W / 2, titleStartY + i * 3.2, { align: 'center' })
  })

  // Sublabels "Inicial" / "Final"
  let sx = x + GROUP_LABEL_W
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  ;['Inicial', 'Final'].forEach((label, i) => {
    doc.rect(sx, y + i * VITAL_ROW_H, GROUP_SUBLABEL_W, VITAL_ROW_H, 'D')
    doc.text(label, sx + GROUP_SUBLABEL_W / 2, y + i * VITAL_ROW_H + VITAL_ROW_H / 2 + 1, { align: 'center' })
  })

  // Valores
  const vx = sx + GROUP_SUBLABEL_W
  const values = [inicialValue, finalValue]
  doc.setFontSize(7.6)
  values.forEach((val, i) => {
    doc.setFillColor(...BOX_FILL)
    doc.rect(vx, y + i * VITAL_ROW_H, GROUP_VALUE_W, VITAL_ROW_H, 'FD')
    doc.text(val || '', vx + GROUP_VALUE_W / 2, y + i * VITAL_ROW_H + VITAL_ROW_H / 2 + 1, { align: 'center' })
  })

  return y + VITAL_ROW_H * 2
}

function drawVitalsTable(doc, x, y, evolution) {
  let gx = x
  drawVitalsGroup(doc, gx, y, 'Pressão Arterial', evolution.paInicial, evolution.paFinal)
  gx += GROUP_W
  drawVitalsGroup(doc, gx, y, 'Saturação', evolution.satInicial, evolution.satFinal)
  gx += GROUP_W
  drawVitalsGroup(doc, gx, y, 'Frequência Cardíaca', evolution.fcInicial, evolution.fcFinal)
  return y + VITAL_ROW_H * 2
}

// ---- Texto da evolução (quebra automática) ----
function getEvolutionTextLines(doc, evolution) {
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  const textBoxWidth = CONTENT_W - 4
  return doc.splitTextToSize(evolution.texto || '', textBoxWidth)
}

function evolutionTextBoxHeight(lines) {
  const lineCount = Math.max(MIN_TEXT_LINES, lines.length)
  return lineCount * LINE_HEIGHT + 4
}

// ---- Assinatura / Carimbo do Profissional ----
const SIGNATURE_LINE_W = 65
const SIGNATURE_AREA_H = 16

function drawSignature(doc, x, y, width, carimboText) {
  const lineX2 = x + width
  const lineX1 = lineX2 - SIGNATURE_LINE_W
  let sy = y + 6

  if (carimboText) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...TEXT_COLOR)
    doc.text(carimboText, lineX1 + SIGNATURE_LINE_W / 2, sy, { align: 'center' })
    sy += 4
  }

  doc.setDrawColor(...TEXT_COLOR)
  doc.setLineWidth(0.3)
  doc.line(lineX1, sy, lineX2, sy)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text('Carimbo do Profissional', lineX1 + SIGNATURE_LINE_W / 2, sy + 4.5, { align: 'center' })

  return y + SIGNATURE_AREA_H
}

// ---- Altura total do bloco de evolução (mesma lógica usada ao desenhar) ----
export function measureEvolutionBlockHeight(doc, evolution) {
  const lines = getEvolutionTextLines(doc, evolution)
  const dataRowH = ROW_H + 3
  const vitalsH = VITAL_ROW_H * 2 + 3
  const evoLabelH = 5
  const evoBoxH = evolutionTextBoxHeight(lines)
  return dataRowH + vitalsH + evoLabelH + evoBoxH + SIGNATURE_AREA_H
}

// ---- Desenha um bloco de evolução completo, com fallback de overflow ----
// Caso o texto da evolução seja tão longo que o bloco não caiba nem numa
// página inteira, a parte fixa (data/nº atendimento + sinais vitais) e o
// início do texto ficam juntos; apenas o corpo do texto pode continuar na
// página seguinte — a assinatura é sempre desenhada após a última linha.
export function drawEvolutionBlock(doc, startY, evolution, carimboText) {
  let y = startY

  y = drawDataSessionRow(doc, MARGIN, y, CONTENT_W, evolution)
  y += 3
  y = drawVitalsTable(doc, MARGIN, y, evolution)
  y += 3

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...TEXT_COLOR)
  doc.text('Evolução:', MARGIN, y + 3.5)
  y += 5

  const lines = getEvolutionTextLines(doc, evolution)
  const lineCount = Math.max(MIN_TEXT_LINES, lines.length)
  const paddedLines = [...lines]
  while (paddedLines.length < lineCount) paddedLines.push('')

  let li = 0
  while (li < paddedLines.length) {
    const remaining = PAGE_BOTTOM - y
    const maxLinesHere = Math.max(1, Math.floor((remaining - 4) / LINE_HEIGHT))
    const linesToDraw = paddedLines.slice(li, li + maxLinesHere)

    const boxH = linesToDraw.length * LINE_HEIGHT + 4
    doc.setFillColor(...BOX_FILL)
    doc.setDrawColor(...BORDER_COLOR)
    doc.setLineWidth(0.25)
    doc.rect(MARGIN, y, CONTENT_W, boxH, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...TEXT_COLOR)
    linesToDraw.forEach((line, i) => {
      doc.text(line, MARGIN + 2, y + 4.2 + i * LINE_HEIGHT)
    })

    y += boxH
    li += linesToDraw.length

    if (li < paddedLines.length) {
      doc.addPage()
      y = MARGIN
    }
  }

  y += 4
  y = ensureSpace(doc, y, SIGNATURE_AREA_H)
  y = drawSignature(doc, MARGIN, y, CONTENT_W, carimboText)

  return y
}

// ---- Orquestrador: gera o documento PDF completo ----
export async function generateEvolutionPdf(reportData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })

  const iconDataUrl = await loadReportLogo().catch(() => null)

  let y = MARGIN
  y = drawBanner(doc, MARGIN, y, CONTENT_W, { iconDataUrl })
  y += 6
  y = drawPatientHeader(doc, MARGIN, y, CONTENT_W, reportData.patient)
  y += 4

  reportData.evolutions.forEach(evolution => {
    const blockHeight = measureEvolutionBlockHeight(doc, evolution)

    if (y + blockHeight > PAGE_BOTTOM) {
      doc.addPage()
      y = MARGIN
    }

    y = drawEvolutionBlock(doc, y, evolution, reportData.carimboText)
    y += BLOCK_GAP
  })

  return doc
}
