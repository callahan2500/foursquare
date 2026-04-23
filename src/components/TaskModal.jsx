import { useState, useEffect, useRef } from 'react'
import { QUADRANTS, QUADRANT_IDS, EFFORT_OPTIONS, RECURRENCE_OPTIONS } from '../constants'
import { generateId } from '../lib/utils'

function TaskModal({ task, defaultQuadrant, onSave, onClose, limits, tasks }) {
  const isEditing = !!task
  const titleRef = useRef(null)

  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [quadrant, setQuadrant] = useState(task?.quadrant || defaultQuadrant || 'UNSORTED')
  const [dueDate, setDueDate] = useState(task?.dueDate || '')
  const [effort, setEffort] = useState(task?.effort || null)
  const [tags, setTags] = useState(task?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [links, setLinks] = useState(task?.links || [])
  const [subtasks, setSubtasks] = useState(task?.subtasks || [])
  const [subtaskInput, setSubtaskInput] = useState('')
  const [recurrence, setRecurrence] = useState(task?.recurrence?.pattern || '')

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Check if a quadrant is full (for quadrant selector)
  const isQuadrantFull = (qId) => {
    if (!limits || !limits[qId]) return false
    const activeCount = (tasks || []).filter(t => t.quadrant === qId && t.status === 'active').length
    if (isEditing && task.quadrant === qId) return activeCount - 1 >= limits[qId]
    return activeCount >= limits[qId]
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return

    const cleanLinks = links.filter(l => l.url.trim())

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      quadrant,
      dueDate: dueDate || null,
      effort,
      tags,
      links: cleanLinks,
      subtasks,
      recurrence: recurrence ? { pattern: recurrence } : null
    }

    if (isEditing) {
      onSave(task.id, taskData)
    } else {
      onSave(null, taskData)
    }
    onClose()
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      const val = tagInput.trim().replace(/,/g, '')
      if (val && !tags.includes(val)) {
        setTags([...tags, val])
      }
      setTagInput('')
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1))
    }
  }

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  const addLink = () => {
    setLinks([...links, { url: '', label: '' }])
  }

  const updateLink = (index, field, value) => {
    setLinks(links.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  const removeLink = (index) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const addSubtask = () => {
    const val = subtaskInput.trim()
    if (!val) return
    setSubtasks([...subtasks, { id: generateId(), title: val, completed: false }])
    setSubtaskInput('')
  }

  const handleSubtaskKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSubtask()
    }
  }

  const toggleSubtask = (id) => {
    setSubtasks(subtasks.map(s => s.id === id ? { ...s, completed: !s.completed } : s))
  }

  const removeSubtask = (id) => {
    setSubtasks(subtasks.filter(s => s.id !== id))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Task' : 'Add Task'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title</label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be done?"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details (optional)"
            />
          </div>

          <div className="form-group">
            <label>Quadrant</label>
            <div className="quadrant-options">
              {QUADRANT_IDS.map(qId => {
                const full = isQuadrantFull(qId)
                const isCurrent = quadrant === qId
                return (
                  <button
                    key={qId}
                    type="button"
                    className={`quadrant-option ${isCurrent ? `selected q-${qId}` : ''} ${full && !isCurrent ? 'disabled-quadrant' : ''}`}
                    onClick={() => { if (!full || isCurrent) setQuadrant(qId) }}
                    disabled={full && !isCurrent}
                  >
                    <div className="quadrant-option-label">{QUADRANTS[qId].label}</div>
                    <div className="quadrant-option-meaning">
                      {full && !isCurrent ? 'Full' : QUADRANTS[qId].meaning}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Effort</label>
              <div className="effort-options">
                {EFFORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`effort-option ${effort === opt.value ? 'selected' : ''}`}
                    onClick={() => setEffort(effort === opt.value ? null : opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Recurrence</label>
              <select
                className="recurrence-select"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                disabled={!dueDate}
              >
                {RECURRENCE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {!dueDate && recurrence === '' && (
                <div className="form-hint">Set a due date to enable recurrence</div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Tags</label>
            <div
              className="tags-input-container"
              onClick={() => document.querySelector('.tags-input')?.focus()}
            >
              {tags.map(tag => (
                <span key={tag} className="tag-pill">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>×</button>
                </span>
              ))}
              <input
                type="text"
                className="tags-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                placeholder={tags.length === 0 ? 'Type and press Enter' : ''}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Subtasks</label>
            <div className="subtasks-list">
              {subtasks.map(s => (
                <div key={s.id} className="subtask-item">
                  <input
                    type="checkbox"
                    checked={s.completed}
                    onChange={() => toggleSubtask(s.id)}
                  />
                  <span className={s.completed ? 'subtask-done' : ''}>{s.title}</span>
                  <button type="button" className="subtask-remove" onClick={() => removeSubtask(s.id)}>×</button>
                </div>
              ))}
            </div>
            <div className="subtask-add-row">
              <input
                type="text"
                value={subtaskInput}
                onChange={(e) => setSubtaskInput(e.target.value)}
                onKeyDown={handleSubtaskKeyDown}
                placeholder="Add a subtask"
                className="subtask-input"
              />
              <button type="button" className="link-add-btn" onClick={addSubtask} style={{ marginTop: 0 }}>
                + Add subtask
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Links</label>
            {links.map((link, i) => (
              <div key={i} className="link-entry">
                <input
                  type="url"
                  className="link-url-input"
                  value={link.url}
                  onChange={(e) => updateLink(i, 'url', e.target.value)}
                  placeholder="https://..."
                />
                <input
                  type="text"
                  className="link-label-input"
                  value={link.label}
                  onChange={(e) => updateLink(i, 'label', e.target.value)}
                  placeholder="Label (optional)"
                />
                <button type="button" className="link-remove-btn" onClick={() => removeLink(i)}>×</button>
              </div>
            ))}
            <button type="button" className="link-add-btn" onClick={addLink}>
              + Add link
            </button>
          </div>

          {isEditing && task.focusMinutes > 0 && (
            <div className="form-group">
              <label>Focus Time</label>
              <div className="focus-time-display">{task.focusMinutes}m focused</div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="add-btn" disabled={!title.trim()}>
              {isEditing ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TaskModal
