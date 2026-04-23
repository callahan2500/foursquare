import { useState, useRef } from 'react'
import { exportData, importData } from '../lib/storage'

function Settings({ settings, allMatrices, actions, state }) {
  const [confirmClear, setConfirmClear] = useState(false)
  const fileInputRef = useRef(null)

  // Aggregate tasks from all matrices
  const allTasks = allMatrices.flatMap(m => m.tasks)
  const trashedTasks = allTasks.filter(t => t.status === 'trashed')
  const activeTasks = allTasks.filter(t => t.status === 'active')
  const completedTasks = allTasks.filter(t => t.status === 'completed')

  // Map task IDs to matrix names for trash display
  const taskMatrixMap = {}
  allMatrices.forEach(m => {
    m.tasks.forEach(t => { taskMatrixMap[t.id] = m.name })
  })

  const handleExport = () => {
    exportData(state)
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const data = await importData(file)
      actions.importState(data)
    } catch (err) {
      alert(err.message)
    }
    e.target.value = ''
  }

  const handleClearAll = () => {
    if (confirmClear) {
      actions.clearAllData()
      setConfirmClear(false)
    } else {
      setConfirmClear(true)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    })
  }

  return (
    <div className="settings">
      <h1>Settings</h1>

      <section className="settings-section">
        <h2>Appearance</h2>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Theme</div>
            <div className="setting-description">Switch between dark and light mode</div>
          </div>
          <button className="theme-toggle" onClick={actions.toggleTheme}>
            {settings.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2>Data</h2>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Overview</div>
            <div className="setting-description">
              {allMatrices.length} matrix{allMatrices.length !== 1 ? 'es' : ''} — {activeTasks.length} active, {completedTasks.length} completed, {trashedTasks.length} trashed
            </div>
          </div>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Export data</div>
            <div className="setting-description">Download all matrices and tasks as a JSON backup</div>
          </div>
          <button className="secondary-btn" onClick={handleExport}>
            Export JSON
          </button>
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Import data</div>
            <div className="setting-description">Restore from a JSON backup (replaces current data). Supports v1 and v2 formats.</div>
          </div>
          <button className="secondary-btn" onClick={() => fileInputRef.current?.click()}>
            Import JSON
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
        </div>
        <div className="setting-item">
          <div className="setting-info">
            <div className="setting-label">Clear all data</div>
            <div className="setting-description">Permanently delete all matrices, tasks, and settings</div>
          </div>
          {confirmClear ? (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="danger-btn" onClick={handleClearAll} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Confirm
              </button>
              <button className="secondary-btn" onClick={() => setConfirmClear(false)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="secondary-btn" onClick={handleClearAll} style={{ color: 'var(--accent-red)' }}>
              Clear All
            </button>
          )}
        </div>
      </section>

      {trashedTasks.length > 0 && (
        <section className="settings-section">
          <h2>Trash</h2>
          <div className="setting-item">
            <div className="setting-info">
              <div className="setting-description">
                {trashedTasks.length} trashed task{trashedTasks.length !== 1 ? 's' : ''} — auto-deleted after 7 days
              </div>
            </div>
          </div>
          <div className="trash-list">
            {trashedTasks.map(task => (
              <div key={task.id} className="trash-item">
                <div className="trash-item-info">
                  <div className="trash-item-title">{task.title}</div>
                  <div className="trash-item-meta">
                    {taskMatrixMap[task.id] && <span className="trash-matrix-name">{taskMatrixMap[task.id]}</span>}
                    {' · '}Deleted {formatDate(task.trashedAt)}
                  </div>
                </div>
                <div className="trash-item-actions">
                  <button
                    className="restore-btn"
                    onClick={() => actions.restoreTask(task.id)}
                  >
                    Restore
                  </button>
                  <button
                    className="perm-delete-btn"
                    onClick={() => {
                      if (confirm(`Permanently delete "${task.title}"?`)) {
                        actions.permanentlyDeleteTask(task.id)
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export default Settings
