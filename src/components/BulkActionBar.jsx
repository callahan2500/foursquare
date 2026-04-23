import { useState } from 'react'
import { QUADRANTS, QUADRANT_IDS, EFFORT_OPTIONS } from '../constants'

function BulkActionBar({ selectedCount, onMove, onDelete, onUpdate, onDone }) {
  const [showMove, setShowMove] = useState(false)
  const [showEffort, setShowEffort] = useState(false)
  const [tagInput, setTagInput] = useState('')

  const handleAddTag = () => {
    const val = tagInput.trim()
    if (!val) return
    onUpdate({ addTag: val })
    setTagInput('')
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <div className="bulk-action-bar">
      <span className="bulk-count">{selectedCount} selected</span>

      <div className="bulk-actions">
        <div style={{ position: 'relative' }}>
          <button className="bulk-btn" onClick={() => { setShowMove(!showMove); setShowEffort(false) }}>
            Move to
          </button>
          {showMove && (
            <div className="bulk-dropdown">
              {[...QUADRANT_IDS, 'UNSORTED'].map(q => (
                <button
                  key={q}
                  className="bulk-dropdown-item"
                  onClick={() => { onMove(q); setShowMove(false) }}
                >
                  {QUADRANTS[q].label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button className="bulk-btn" onClick={() => { setShowEffort(!showEffort); setShowMove(false) }}>
            Set Effort
          </button>
          {showEffort && (
            <div className="bulk-dropdown">
              {EFFORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className="bulk-dropdown-item"
                  onClick={() => { onUpdate({ effort: opt.value }); setShowEffort(false) }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="bulk-tag-input-group">
          <input
            type="text"
            className="bulk-tag-input"
            placeholder="Add tag"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagKeyDown}
          />
        </div>

        <button className="bulk-btn danger" onClick={onDelete}>Delete</button>
      </div>

      <button className="bulk-done-btn" onClick={onDone}>Done</button>
    </div>
  )
}

export default BulkActionBar
