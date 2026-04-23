import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QUADRANT_IDS, QUADRANTS, MATRIX_ICONS, SORT_MODES } from '../constants'

function MatrixSettings({ matrix, actions }) {
  const navigate = useNavigate()
  const [name, setName] = useState(matrix?.name || '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!matrix) return null

  const handleNameBlur = () => {
    const trimmed = name.trim()
    if (trimmed && trimmed !== matrix.name) {
      actions.renameMatrix(matrix.id, trimmed)
    } else {
      setName(matrix.name)
    }
  }

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') e.target.blur()
  }

  const handleDelete = () => {
    if (confirmDelete) {
      actions.deleteMatrix(matrix.id)
      navigate('/')
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
    }
  }

  const handleLimitChange = (qId, value) => {
    const num = value === '' ? null : parseInt(value, 10)
    const limit = (num !== null && !isNaN(num) && num > 0) ? num : null
    actions.updateMatrixSettings({
      limits: { ...matrix.settings.limits, [qId]: limit }
    })
  }

  const handleSortChange = (qId, mode) => {
    actions.updateQuadrantSortMode(qId, mode)
  }

  return (
    <div className="settings">
      <div className="matrix-settings-header">
        <button className="back-btn" onClick={() => navigate(`/matrix/${matrix.id}`)}>
          ← Back to Matrix
        </button>
        <h1>{matrix.icon} {matrix.name} Settings</h1>
      </div>

      <section className="settings-section">
        <h2>General</h2>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Name</div>
          </div>
          <input
            type="text"
            className="matrix-setting-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
          />
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Icon</div>
          </div>
          <div className="icon-picker-grid compact">
            {MATRIX_ICONS.map(icon => (
              <button
                key={icon}
                className={`icon-picker-item ${matrix.icon === icon ? 'selected' : ''}`}
                onClick={() => actions.updateMatrixIcon(matrix.id, icon)}
                type="button"
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section">
        <h2>Behavior</h2>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Auto-escalate</div>
            <div className="setting-description">
              Automatically move Q2 tasks to Q1 when their due date is within 48 hours
            </div>
          </div>
          <button
            className={`toggle-switch ${matrix.settings.autoEscalate ? 'active' : ''}`}
            onClick={() => actions.updateMatrixSettings({ autoEscalate: !matrix.settings.autoEscalate })}
            aria-label="Toggle auto-escalate"
          />
        </div>
      </section>

      <section className="settings-section">
        <h2>Quadrant Limits</h2>
        <div className="setting-description" style={{ marginBottom: '0.75rem' }}>
          Set maximum active tasks per quadrant. Leave empty for unlimited.
        </div>
        {[...QUADRANT_IDS, 'UNSORTED'].map(qId => (
          <div key={qId} className="setting-item">
            <div className="setting-info">
              <div className="setting-label">{QUADRANTS[qId].label}</div>
            </div>
            <input
              type="number"
              className="limit-input"
              value={matrix.settings.limits[qId] ?? ''}
              onChange={(e) => handleLimitChange(qId, e.target.value)}
              placeholder="∞"
              min="1"
            />
          </div>
        ))}
      </section>

      <section className="settings-section">
        <h2>Sort Modes</h2>
        <div className="setting-description" style={{ marginBottom: '0.75rem' }}>
          Choose how tasks are ordered in each quadrant. Drag-and-drop reordering is only available in Manual mode.
        </div>
        {[...QUADRANT_IDS, 'UNSORTED'].map(qId => (
          <div key={qId} className="setting-item">
            <div className="setting-info">
              <div className="setting-label">{QUADRANTS[qId].label}</div>
            </div>
            <select
              className="sort-mode-select"
              value={matrix.settings.sortModes[qId] || 'manual'}
              onChange={(e) => handleSortChange(qId, e.target.value)}
            >
              {SORT_MODES.map(mode => (
                <option key={mode.value} value={mode.value}>{mode.label}</option>
              ))}
            </select>
          </div>
        ))}
      </section>

      <section className="settings-section">
        <h2>Danger Zone</h2>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Delete matrix</div>
            <div className="setting-description">
              Permanently delete this matrix and all its tasks
            </div>
          </div>
          {confirmDelete ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="danger-btn" onClick={handleDelete} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Confirm
              </button>
              <button className="secondary-btn" onClick={() => setConfirmDelete(false)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="secondary-btn"
              onClick={handleDelete}
              style={{ color: 'var(--accent-red)' }}
              disabled={false}
            >
              Delete Matrix
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

export default MatrixSettings
