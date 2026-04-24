import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { MATRIX_ICONS } from '../constants'
import '../Sidebar.css'

function Sidebar({ matrices, activeMatrixId, actions }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📋')
  const [showIconPicker, setShowIconPicker] = useState(false)
  const nameInputRef = useRef(null)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => {
    if (creating) {
      nameInputRef.current?.focus()
    }
  }, [creating])

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    const id = actions.createMatrix(name, newIcon)
    setCreating(false)
    setNewName('')
    setNewIcon('📋')
    setShowIconPicker(false)
    navigate(`/matrix/${id}`)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleCreate()
    if (e.key === 'Escape') {
      setCreating(false)
      setNewName('')
      setShowIconPicker(false)
    }
  }

  const isMatrixRoute = location.pathname.startsWith('/matrix/')

  return (
    <>
      <button
        className={`hamburger-btn ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        <span />
        <span />
        <span />
      </button>

      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      <div className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <Link to={`/matrix/${activeMatrixId}`} className="sidebar-logo">
          <h2>FourSquare</h2>
          <div className="logo-subtitle">Prioritize what matters</div>
        </Link>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Matrices</div>
          <div className="matrix-list">
            {matrices.map(m => {
              const activeCount = m.tasks.filter(t => t.status === 'active').length
              const isActive = m.id === activeMatrixId && isMatrixRoute
              return (
                <Link
                  key={m.id}
                  to={`/matrix/${m.id}`}
                  className={`nav-item matrix-nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => actions.switchMatrix(m.id)}
                >
                  <span className="nav-icon">{m.icon}</span>
                  <span className="nav-text">{m.name}</span>
                  {activeCount > 0 && (
                    <span className="matrix-task-count">{activeCount}</span>
                  )}
                </Link>
              )
            })}

            {creating ? (
              <div className="matrix-create-inline">
                <div className="matrix-create-row">
                  <button
                    className="icon-picker-btn"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    type="button"
                  >
                    {newIcon}
                  </button>
                  <input
                    ref={nameInputRef}
                    type="text"
                    className="matrix-name-input"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Matrix name"
                  />
                  <button className="matrix-create-confirm" onClick={handleCreate} disabled={!newName.trim()}>
                    +
                  </button>
                </div>
                {showIconPicker && (
                  <div className="icon-picker-grid">
                    {MATRIX_ICONS.map(icon => (
                      <button
                        key={icon}
                        className={`icon-picker-item ${newIcon === icon ? 'selected' : ''}`}
                        onClick={() => { setNewIcon(icon); setShowIconPicker(false) }}
                        type="button"
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button className="matrix-add-btn" onClick={() => setCreating(true)}>
                <span className="nav-icon">+</span>
                <span className="nav-text">New Matrix</span>
              </button>
            )}
          </div>

          <div className="nav-bottom">
            <Link
              to="/review"
              className={`nav-item ${location.pathname === '/review' ? 'active' : ''}`}
            >
              <span className="nav-icon">📝</span>
              <span className="nav-text">Weekly Review</span>
            </Link>
            <Link
              to="/insights"
              className={`nav-item ${location.pathname === '/insights' ? 'active' : ''}`}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-text">Insights</span>
            </Link>
            <Link
              to="/settings"
              className={`nav-item ${location.pathname === '/settings' ? 'active' : ''}`}
            >
              <span className="nav-icon">⚙️</span>
              <span className="nav-text">Settings</span>
            </Link>
            <Link
              to="/guide"
              className={`nav-item ${location.pathname === '/guide' ? 'active' : ''}`}
            >
              <span className="nav-icon">❓</span>
              <span className="nav-text">How to Use</span>
            </Link>
          </div>
        </nav>
      </div>
    </>
  )
}

export default Sidebar
