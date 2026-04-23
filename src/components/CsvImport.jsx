import { useState, useEffect, useRef } from 'react'
import Papa from 'papaparse'
import { QUADRANT_IDS, EFFORT_OPTIONS } from '../constants'

const VALID_EFFORTS = EFFORT_OPTIONS.map(e => e.value)
const QUADRANT_MAP = {
  'q1': 'Q1', 'do now': 'Q1', 'do': 'Q1', 'urgent important': 'Q1',
  'q2': 'Q2', 'schedule': 'Q2', 'important': 'Q2', 'important not urgent': 'Q2',
  'q3': 'Q3', 'delegate': 'Q3', 'urgent': 'Q3', 'urgent not important': 'Q3',
  'q4': 'Q4', 'eliminate': 'Q4', 'neither': 'Q4', 'not urgent not important': 'Q4',
  'unsorted': 'UNSORTED', '': 'UNSORTED'
}

function normalizeColumn(name) {
  return name.toLowerCase().replace(/[^a-z]/g, '')
}

function mapColumns(headers) {
  const map = {}
  const COLUMN_ALIASES = {
    title: ['title', 'name', 'task', 'taskname', 'tasktitle'],
    description: ['description', 'desc', 'details', 'notes', 'note'],
    quadrant: ['quadrant', 'priority', 'category', 'bucket', 'matrix'],
    dueDate: ['duedate', 'due', 'deadline', 'dueby', 'date'],
    tags: ['tags', 'tag', 'labels', 'label', 'categories'],
    effort: ['effort', 'size', 'estimate', 'complexity'],
    links: ['links', 'link', 'url', 'urls'],
    subtasks: ['subtasks', 'subtask', 'checklist', 'steps'],
    recurrence: ['recurrence', 'recurring', 'repeat', 'frequency']
  }

  headers.forEach((header, index) => {
    const norm = normalizeColumn(header)
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.includes(norm) && !map[field]) {
        map[field] = index
        break
      }
    }
  })
  return map
}

function validateRow(row, columnMap) {
  const errors = []

  const title = columnMap.title !== undefined ? (row[columnMap.title] || '').trim() : ''
  if (!title) errors.push('Missing title')

  let quadrant = 'UNSORTED'
  if (columnMap.quadrant !== undefined) {
    const raw = (row[columnMap.quadrant] || '').trim().toLowerCase()
    quadrant = QUADRANT_MAP[raw] || null
    if (raw && !quadrant) {
      errors.push(`Invalid quadrant: "${row[columnMap.quadrant]}"`)
      quadrant = 'UNSORTED'
    }
    if (!quadrant) quadrant = 'UNSORTED'
  }

  let dueDate = null
  if (columnMap.dueDate !== undefined) {
    const raw = (row[columnMap.dueDate] || '').trim()
    if (raw) {
      const parsed = new Date(raw)
      if (isNaN(parsed.getTime())) {
        errors.push(`Invalid date: "${raw}"`)
      } else {
        dueDate = parsed.toISOString().split('T')[0]
      }
    }
  }

  let effort = null
  if (columnMap.effort !== undefined) {
    const raw = (row[columnMap.effort] || '').trim().toUpperCase()
    if (raw) {
      if (VALID_EFFORTS.includes(raw)) {
        effort = raw
      } else {
        errors.push(`Invalid effort: "${raw}"`)
      }
    }
  }

  let tags = []
  if (columnMap.tags !== undefined) {
    const raw = (row[columnMap.tags] || '').trim()
    if (raw) {
      tags = raw.split(/[,;|]/).map(t => t.trim()).filter(Boolean)
    }
  }

  let links = []
  if (columnMap.links !== undefined) {
    const raw = (row[columnMap.links] || '').trim()
    if (raw) {
      links = raw.split(/[,;|]/).map(u => u.trim()).filter(Boolean).map(url => ({ url, label: '' }))
    }
  }

  const description = columnMap.description !== undefined ? (row[columnMap.description] || '').trim() : ''

  let subtasks = []
  if (columnMap.subtasks !== undefined) {
    const raw = (row[columnMap.subtasks] || '').trim()
    if (raw) {
      subtasks = raw.split(/[;|]/).map(s => s.trim()).filter(Boolean).map(s => ({
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
        title: s,
        completed: false
      }))
    }
  }

  let recurrence = null
  if (columnMap.recurrence !== undefined) {
    const raw = (row[columnMap.recurrence] || '').trim().toLowerCase()
    if (raw && ['daily', 'weekly', 'monthly'].includes(raw)) {
      recurrence = { pattern: raw }
    }
  }

  return {
    data: { title, description, quadrant, dueDate, effort, tags, links, subtasks, recurrence },
    errors
  }
}

function CsvImport({ onImport, onClose, limits, tasks }) {
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [validatedRows, setValidatedRows] = useState([])
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef(null)

  const handleFile = (file) => {
    if (!file || !file.name.endsWith('.csv')) return

    Papa.parse(file, {
      complete: (results) => {
        if (results.data.length < 2) return

        const hdrs = results.data[0]
        const dataRows = results.data.slice(1).filter(row => row.some(cell => cell.trim()))

        setHeaders(hdrs)
        setRows(dataRows)

        const columnMap = mapColumns(hdrs)
        const validated = dataRows.map(row => validateRow(row, columnMap))
        setValidatedRows(validated)
      },
      error: () => {}
    })
  }

  // Check for globally dropped file
  useEffect(() => {
    if (window.__csvDroppedFile) {
      handleFile(window.__csvDroppedFile)
      window.__csvDroppedFile = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDrop = (e) => {
    e.preventDefault()
    setDragActive(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    handleFile(file)
  }

  // Count how many tasks would be skipped due to limits
  const getImportStats = () => {
    const validRows = validatedRows.filter(r => r.errors.length === 0 && r.data.title)
    if (!limits) return { importable: validRows.length, skipped: 0 }

    const counts = {}
    for (const qId of [...QUADRANT_IDS, 'UNSORTED']) {
      counts[qId] = (tasks || []).filter(t => t.quadrant === qId && t.status === 'active').length
    }

    let importable = 0
    let skipped = 0
    for (const row of validRows) {
      const q = row.data.quadrant || 'UNSORTED'
      const limit = limits[q]
      if (limit && counts[q] >= limit) {
        skipped++
      } else {
        importable++
        counts[q] = (counts[q] || 0) + 1
      }
    }
    return { importable, skipped }
  }

  const validCount = validatedRows.filter(r => r.errors.length === 0 && r.data.title).length
  const errorCount = validatedRows.filter(r => r.errors.length > 0).length
  const { importable, skipped } = getImportStats()
  const previewRows = validatedRows.slice(0, 10)

  const handleImport = () => {
    const tasksToImport = validatedRows
      .filter(r => r.errors.length === 0 && r.data.title)
      .map(r => r.data)

    onImport(tasksToImport)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ minWidth: '600px', maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import CSV</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {validatedRows.length === 0 ? (
          <>
            <div
              className={`csv-dropzone ${dragActive ? 'active' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true) }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="csv-dropzone-text">
                <strong>Drop a CSV file</strong> or click to browse
              </div>
              <div className="csv-dropzone-hint">
                Expected columns: title, description, quadrant, due_date, tags, effort, links
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </>
        ) : (
          <div className="csv-preview">
            <div className="csv-summary">
              <span className="csv-summary-valid">{validCount} valid rows</span>
              {errorCount > 0 && (
                <span className="csv-summary-errors">{errorCount} rows with errors</span>
              )}
              {skipped > 0 && (
                <span className="csv-summary-errors">{skipped} will be skipped (quadrant limits)</span>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="csv-table">
                <thead>
                  <tr>
                    <th>#</th>
                    {headers.map((h, i) => <th key={i}>{h}</th>)}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, i) => (
                    <tr key={i} className={row.errors.length > 0 ? 'csv-error-row' : ''}>
                      <td>{i + 1}</td>
                      {rows[i].map((cell, j) => <td key={j}>{cell}</td>)}
                      <td>
                        {row.errors.length > 0 ? (
                          <span className="csv-error-msg">{row.errors.join(', ')}</span>
                        ) : '✓'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {validatedRows.length > 10 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '0.75rem' }}>
                Showing first 10 of {validatedRows.length} rows
              </div>
            )}

            <div className="modal-actions">
              <button className="cancel-btn" onClick={onClose}>Cancel</button>
              <button
                className="add-btn"
                onClick={handleImport}
                disabled={validCount === 0}
              >
                Import {importable} task{importable !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CsvImport
