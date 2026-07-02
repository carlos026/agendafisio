// ===== Exportação do Relatório de Evolução em PDF =====
// Monta os dados do paciente selecionado e dispara o download do PDF
// diretamente no navegador (mesmo padrão de src/services/excelExport.js).

import { buildEvolutionReportData } from './evolutionReportData'
import { generateEvolutionPdf } from './evolutionPdfTemplate'

export async function exportEvolutionReportPDF(patientId, { patients, appointments, carimboText }) {
  const reportData = buildEvolutionReportData({ patientId, patients, appointments, carimboText })
  const doc = await generateEvolutionPdf(reportData)

  const fileName = `Relatorio_Evolucao_${reportData.patient.name.trim().replace(/\s+/g, '_')}.pdf`
  doc.save(fileName)

  return { fileName, evolutionsExported: reportData.evolutions.length }
}
