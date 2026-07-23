import React, { useState, useRef } from 'react'
import { useApp } from '../../App'
import { parseFile, prepareImport, prepareEvolutions, preparePatientDetails, prepareServiceTypes, executeImport } from '../../services/excelService'
import { exportToXLSX } from '../../services/excelExport'
import { isoToDisplay, statusToLabel, appointmentTypeToLabel } from '../../utils/excelParser'
import { formatCurrency } from '../../utils/helpers'

// Estados do fluxo de importação
const STEP = {
  IDLE:     'idle',      // nenhum arquivo selecionado
  PARSING:  'parsing',   // lendo o arquivo
  PREVIEW:  'preview',   // mostrando preview antes de confirmar
  IMPORTING:'importing', // salvando no sistema
  DONE:     'done',      // importação concluída
}

export default function ImportExportPage() {
  const { setPage, refreshPatients, refreshAppointments, refreshSettings, patients, appointments } = useApp()

  // ---- estado de importação ----
  const [step, setStep]             = useState(STEP.IDLE)
  const [selectedFile, setFile]     = useState(null)
  const [parseError, setParseError] = useState('')
  const [preview, setPreview]       = useState(null)  // { rows, newPatientNames, skipped, evolutions, evolutionsSkipped, patientDetails, serviceTypes }
  const [importResult, setResult]   = useState(null)  // { patientsCreated, appointmentsCreated, errors, evolutionsImported, evolutionErrors, serviceTypesImported }

  // ---- estado de exportação ----
  const [exportMsg, setExportMsg]   = useState('')

  const fileInputRef = useRef(null)

  // ---- handlers de importação ----

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setParseError('Selecione um arquivo .xlsx ou .xls válido')
      return
    }
    setFile(file)
    setParseError('')
    setStep(STEP.IDLE)
    setPreview(null)
    setResult(null)
  }

  async function handleParse() {
    if (!selectedFile) return
    setStep(STEP.PARSING)
    setParseError('')
    try {
      const { appointmentRows, evolutionRows, patientRows, serviceTypeRows } = await parseFile(selectedFile)
      const prepared = prepareImport(appointmentRows)
      const preparedEvolutions = prepareEvolutions(evolutionRows, prepared.rows)
      const patientDetails = preparePatientDetails(patientRows)
      const serviceTypes = prepareServiceTypes(serviceTypeRows)
      setPreview({
        ...prepared,
        evolutions: preparedEvolutions.rows,
        evolutionsSkipped: preparedEvolutions.skipped,
        patientDetails,
        serviceTypes,
      })
      setStep(STEP.PREVIEW)
    } catch (err) {
      setParseError(err.message)
      setStep(STEP.IDLE)
    }
  }

  function handleConfirmImport() {
    if (!preview) return
    setStep(STEP.IMPORTING)
    try {
      const result = executeImport(preview.rows, preview.evolutions, preview.patientDetails, preview.serviceTypes)
      refreshPatients()
      refreshAppointments()
      refreshSettings()
      setResult(result)
      setStep(STEP.DONE)
    } catch (err) {
      setParseError(`Erro durante importação: ${err.message}`)
      setStep(STEP.PREVIEW)
    }
  }

  function handleReset() {
    setStep(STEP.IDLE)
    setFile(null)
    setParseError('')
    setPreview(null)
    setResult(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ---- handler de exportação ----

  function handleExport() {
    try {
      const result = exportToXLSX('fisioterapia-pelvica')
      const evoPart = result.evolutionsExported > 0 ? `, ${result.evolutionsExported} evoluções` : ''
      const typesPart = result.serviceTypesExported > 0 ? ` e ${result.serviceTypesExported} tipos de atendimento` : ''
      setExportMsg(`✓ Arquivo "${result.fileName}" baixado com ${result.appointmentsExported} atendimentos, ${result.patientsExported} pacientes${evoPart}${typesPart}.`)
      setTimeout(() => setExportMsg(''), 6000)
    } catch (err) {
      setExportMsg(`Erro ao exportar: ${err.message}`)
    }
  }

  return (
    <div className="ie-page">

      {/* Cabeçalho com botão voltar */}
      <button className="ie-back-btn" onClick={() => setPage('settings')}>
        ← Voltar para Configurações
      </button>

      {/* ===== SEÇÃO: IMPORTAÇÃO ===== */}
      <section className="ie-section">
        <h2 className="ie-title">Importar Planilha</h2>
        <p className="ie-description">
          Selecione um arquivo <strong>.xlsx</strong> — aceita tanto um arquivo exportado por este sistema (abas <em>Atendimentos</em>,
          <em> Pacientes</em>, <em>Evoluções</em> e <em>Tipos de Atendimento</em>) quanto uma planilha externa com colunas: <em>Paciente,
          Data do Atendimento, Horário, Status, Valor, Status Pagamento</em>.
          Pacientes novos serão criados automaticamente (enriquecidos com dados de nascimento, queixa principal etc. quando a aba
          <em> Pacientes</em> estiver presente). Evoluções só são importadas quando o atendimento correspondente (mesmo paciente,
          data e horário) existir ou estiver sendo criado nesta mesma importação. Se a aba <em>Tipos de Atendimento</em> estiver
          presente, ela substitui os tipos configurados atualmente.
        </p>

        {/* Área de seleção de arquivo */}
        <div
          className={`ie-drop-area ${selectedFile ? 'ie-drop-area--selected' : ''}`}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          {selectedFile ? (
            <>
              <div className="ie-file-icon">📄</div>
              <div className="ie-file-name">{selectedFile.name}</div>
              <div className="ie-file-hint">Toque para trocar o arquivo</div>
            </>
          ) : (
            <>
              <div className="ie-file-icon">📂</div>
              <div className="ie-file-hint">Toque para selecionar arquivo .xlsx</div>
            </>
          )}
        </div>

        {/* Botão analisar */}
        {selectedFile && step !== STEP.DONE && (
          <button
            className="btn btn-primary btn-full"
            style={{ marginTop: '12px' }}
            onClick={handleParse}
            disabled={step === STEP.PARSING}
          >
            {step === STEP.PARSING ? 'Analisando...' : '🔍 Analisar Planilha'}
          </button>
        )}

        {/* Mensagem de erro */}
        {parseError && (
          <div className="alert-error" style={{ marginTop: '12px' }}>{parseError}</div>
        )}

        {/* ---- Preview ---- */}
        {step === STEP.PREVIEW && preview && (
          <div className="ie-preview">
            <div className="ie-preview-stats">
              <div className="ie-stat">
                <span className="ie-stat-num">{preview.rows.length}</span>
                <span className="ie-stat-label">atendimentos para importar</span>
              </div>
              <div className="ie-stat">
                <span className="ie-stat-num">{preview.newPatientNames.length}</span>
                <span className="ie-stat-label">novos pacientes</span>
              </div>
              {preview.evolutions.length > 0 && (
                <div className="ie-stat">
                  <span className="ie-stat-num">{preview.evolutions.length}</span>
                  <span className="ie-stat-label">evoluções para importar</span>
                </div>
              )}
              {Object.keys(preview.patientDetails).length > 0 && (
                <div className="ie-stat">
                  <span className="ie-stat-num">{Object.keys(preview.patientDetails).length}</span>
                  <span className="ie-stat-label">pacientes com dados cadastrais</span>
                </div>
              )}
              {preview.serviceTypes.length > 0 && (
                <div className="ie-stat">
                  <span className="ie-stat-num">{preview.serviceTypes.length}</span>
                  <span className="ie-stat-label">tipos de atendimento</span>
                </div>
              )}
              {preview.skipped.length > 0 && (
                <div className="ie-stat ie-stat--warn">
                  <span className="ie-stat-num">{preview.skipped.length}</span>
                  <span className="ie-stat-label">linhas ignoradas</span>
                </div>
              )}
              {preview.evolutionsSkipped.length > 0 && (
                <div className="ie-stat ie-stat--warn">
                  <span className="ie-stat-num">{preview.evolutionsSkipped.length}</span>
                  <span className="ie-stat-label">evoluções ignoradas</span>
                </div>
              )}
            </div>

            {/* Novos pacientes */}
            {preview.newPatientNames.length > 0 && (
              <div className="ie-new-patients">
                <strong>Novos pacientes:</strong>{' '}
                {preview.newPatientNames.join(', ')}
              </div>
            )}

            {/* Aviso: tipos de atendimento serão substituídos */}
            {preview.serviceTypes.length > 0 && (
              <div className="settings-info" style={{ marginBottom: '12px' }}>
                Os tipos de atendimento configurados atualmente serão <strong>substituídos</strong> pelos {preview.serviceTypes.length} da planilha: {preview.serviceTypes.map(t => t.name).join(', ')}.
              </div>
            )}

            {/* Linhas ignoradas */}
            {preview.skipped.length > 0 && (
              <details className="ie-skipped">
                <summary>{preview.skipped.length} linha(s) ignorada(s) — clique para ver</summary>
                <ul>
                  {preview.skipped.map((s, i) => (
                    <li key={i}>Linha {s.lineNum}: {s.reason}</li>
                  ))}
                </ul>
              </details>
            )}

            {/* Evoluções ignoradas */}
            {preview.evolutionsSkipped.length > 0 && (
              <details className="ie-skipped">
                <summary>{preview.evolutionsSkipped.length} evolução(ões) ignorada(s) — clique para ver</summary>
                <ul>
                  {preview.evolutionsSkipped.map((s, i) => (
                    <li key={i}>Linha {s.lineNum}: {s.reason}</li>
                  ))}
                </ul>
              </details>
            )}

            {/* Tabela de preview (máx. 30 linhas) */}
            {preview.rows.length > 0 && (
              <div className="ie-table-wrap">
                <table className="ie-table">
                  <thead>
                    <tr>
                      <th>Paciente</th>
                      <th>Data</th>
                      <th>Horário</th>
                      <th>Tipo</th>
                      <th>Status</th>
                      <th>Valor</th>
                      <th>Pago</th>
                      <th>Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, 30).map((row, i) => (
                      <tr key={i} className={row._isNewPatient ? 'ie-row-new' : ''}>
                        <td>
                          {row.patientName}
                          {row._isNewPatient && <span className="ie-badge-new">novo</span>}
                        </td>
                        <td>{isoToDisplay(row.date)}</td>
                        <td>{row.time}</td>
                        <td>{appointmentTypeToLabel(row.appointmentType)}</td>
                        <td>{statusToLabel(row.status)}</td>
                        <td>{formatCurrency(row.value)}</td>
                        <td>{row.paid ? '✓' : '○'}</td>
                        <td className="ie-notes-cell">{[row.description, row.notes].filter(Boolean).join(' | ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.rows.length > 30 && (
                  <div className="ie-table-more">
                    + {preview.rows.length - 30} linha(s) não exibida(s) no preview
                  </div>
                )}
              </div>
            )}

            <div className="ie-confirm-row">
              <button className="btn btn-ghost" onClick={handleReset}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleConfirmImport}>
                ✓ Confirmar Importação
              </button>
            </div>
          </div>
        )}

        {/* ---- Resultado ---- */}
        {step === STEP.DONE && importResult && (
          <div className="ie-result">
            <div className="ie-result-icon">✅</div>
            <div className="ie-result-title">Importação concluída!</div>
            <div className="ie-result-body">
              <span>{importResult.appointmentsCreated.length} agendamentos importados</span>
              {importResult.patientsCreated.length > 0 && (
                <span>{importResult.patientsCreated.length} novos pacientes criados</span>
              )}
              {importResult.evolutionsImported.length > 0 && (
                <span>{importResult.evolutionsImported.length} evoluções importadas</span>
              )}
              {importResult.serviceTypesImported > 0 && (
                <span>{importResult.serviceTypesImported} tipos de atendimento configurados</span>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <details className="ie-skipped">
                <summary>{importResult.errors.length} erro(s)</summary>
                <ul>{importResult.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </details>
            )}
            {importResult.evolutionErrors.length > 0 && (
              <details className="ie-skipped">
                <summary>{importResult.evolutionErrors.length} erro(s) em evoluções</summary>
                <ul>{importResult.evolutionErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
              </details>
            )}
            <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setPage('agenda')}>
              Ver Agenda
            </button>
            <button className="btn btn-ghost" style={{ marginTop: '8px' }} onClick={handleReset}>
              Importar outro arquivo
            </button>
          </div>
        )}
      </section>

      {/* ===== SEÇÃO: EXPORTAÇÃO ===== */}
      <section className="ie-section">
        <h2 className="ie-title">Exportar Dados</h2>
        <p className="ie-description">
          Gera um arquivo <strong>.xlsx</strong> com todas as informações atuais do sistema (inclui data de nascimento,
          queixa principal, tipo de consulta, tipos de atendimento configurados e evoluções clínicas registradas).
          O arquivo terá as abas <em>Atendimentos</em>, <em>Pacientes</em>, <em>Tipos de Atendimento</em>, <em>Resumo Financeiro</em> e <em>Evoluções</em> (quando houver).
        </p>

        <div className="ie-export-info">
          <div className="ie-export-count">
            <span className="ie-export-num">{appointments.length}</span> atendimentos
          </div>
          <div className="ie-export-count">
            <span className="ie-export-num">{patients.length}</span> pacientes
          </div>
        </div>

        <button
          className="btn btn-primary btn-full"
          style={{ marginTop: '12px' }}
          onClick={handleExport}
          disabled={appointments.length === 0 && patients.length === 0}
        >
          📥 Exportar XLSX
        </button>

        {exportMsg && (
          <div className={`ie-export-msg ${exportMsg.startsWith('Erro') ? 'ie-export-msg--error' : 'ie-export-msg--success'}`}>
            {exportMsg}
          </div>
        )}
      </section>
    </div>
  )
}
