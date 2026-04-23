import { useState, useEffect, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { QUADRANTS, QUADRANT_IDS } from '../constants'

function getDueStatus(dueDate) {
  if (!dueDate) return null
  const now = new Date()
  const due = new Date(dueDate + 'T23:59:59')
  const diff = due.getTime() - now.getTime()
  const hours = diff / (1000 * 60 * 60)

  if (hours < 0) return 'overdue'
  if (hours < 24) return 'due-soon'
  return 'due-normal'
}

function formatDueDate(dueDate) {
  if (!dueDate) return ''
  const date = new Date(dueDate + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  if (diff > 1 && diff < 7) return `In ${diff} days`
  if (diff < -1 && diff > -7) return `${Math.abs(diff)} days ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

function TaskCard({ task, actions, isOverlay, dragDisabled, selectMode, isSelected, onToggleSelect }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [moveMenuOpen, setMoveMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const menuRef = useRef(null)
  const menuBtnRef = useRef(null)
  const isCompleted = task.status === 'completed'
  const dueStatus = getDueStatus(task.dueDate)
  const [pulsed, setPulsed] = useState(false)
  const wasDragged = useRef(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: task.id,
    data: { task },
    disabled: isOverlay || isCompleted || !!dragDisabled || selectMode
  })

  useEffect(() => {
    if (isDragging) {
      wasDragged.current = true
    }
  }, [isDragging])

  const handleCardClick = (e) => {
    if (selectMode) {
      onToggleSelect?.(task.id)
      return
    }
    if (wasDragged.current) {
      wasDragged.current = false
      return
    }
    if (menuOpen) return
    actions.onEdit(task)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  useEffect(() => {
    if (dueStatus === 'overdue' && !isCompleted && !pulsed) {
      setPulsed(true)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
        setMoveMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const handleCheck = (e) => {
    e.stopPropagation()
    if (selectMode) {
      onToggleSelect?.(task.id)
      return
    }
    if (isCompleted) {
      actions.uncompleteTask(task.id)
    } else {
      actions.completeTask(task.id)
    }
  }

  const links = task.links || []
  const subtasks = task.subtasks || []
  const hasLinks = links.length > 0
  const completedSubtasks = subtasks.filter(s => s.completed).length
  const totalSubtasks = subtasks.length
  const allSubtasksDone = totalSubtasks > 0 && completedSubtasks === totalSubtasks

  const cardClass = [
    'task-card',
    isDragging && 'dragging',
    isOverlay && 'drag-overlay',
    isCompleted && 'completed-card',
    dueStatus === 'overdue' && !isCompleted && pulsed && 'overdue-pulse',
    dragDisabled && !isCompleted && 'no-drag',
    selectMode && isSelected && 'selected-card'
  ].filter(Boolean).join(' ')

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClass}
      onClick={handleCardClick}
      {...attributes}
      {...listeners}
    >
      <input
        type="checkbox"
        className={selectMode ? 'task-select-checkbox' : 'task-checkbox'}
        checked={selectMode ? !!isSelected : isCompleted}
        onChange={handleCheck}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      />

      <div className="task-content">
        <div className="task-title">{task.title}</div>

        {(task.dueDate || task.effort || (task.tags && task.tags.length > 0) || hasLinks || totalSubtasks > 0 || task.recurrence || task.focusMinutes > 0) && (
          <div className="task-meta">
            {task.dueDate && (
              <span className={`due-chip ${dueStatus}`}>
                {formatDueDate(task.dueDate)}
              </span>
            )}
            {task.effort && (
              <span className="effort-badge">{task.effort}</span>
            )}
            {totalSubtasks > 0 && (
              <span className={`subtask-chip ${allSubtasksDone ? 'all-done' : ''}`}>
                {completedSubtasks}/{totalSubtasks}
              </span>
            )}
            {task.recurrence?.pattern && (
              <span className="recurrence-chip">
                {task.recurrence.pattern}
              </span>
            )}
            {task.focusMinutes > 0 && (
              <span className="focus-chip">{task.focusMinutes}m</span>
            )}
            {task.tags && task.tags.map(tag => (
              <span key={tag} className="tag">{tag}</span>
            ))}
            {links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="link-chip"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {link.label || getHostname(link.url)}
              </a>
            ))}
          </div>
        )}
      </div>

      {!selectMode && (
        <div style={{ position: 'relative' }}>
          <button
            ref={menuBtnRef}
            className="task-menu-btn"
            onClick={(e) => {
              e.stopPropagation()
              if (!menuOpen && menuBtnRef.current) {
                const rect = menuBtnRef.current.getBoundingClientRect()
                setMenuPos({ top: rect.bottom + 4, left: rect.right })
              }
              setMenuOpen(!menuOpen)
              setMoveMenuOpen(false)
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            ...
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              className="context-menu"
              style={{ position: 'fixed', top: menuPos.top, left: 'auto', right: window.innerWidth - menuPos.left }}
            >
              <button
                className="context-menu-item"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  actions.onEdit(task)
                }}
              >
                Edit
              </button>
              <button
                className="context-menu-item"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  actions.duplicateTask(task.id)
                }}
              >
                Duplicate
              </button>
              <button
                className="context-menu-item"
                onClick={(e) => {
                  e.stopPropagation()
                  setMoveMenuOpen(!moveMenuOpen)
                }}
              >
                Move to...
              </button>
              {moveMenuOpen && (
                <div className="move-submenu">
                  {[...QUADRANT_IDS, 'UNSORTED']
                    .filter(q => q !== task.quadrant)
                    .map(q => (
                      <button
                        key={q}
                        className="context-menu-item"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpen(false)
                          setMoveMenuOpen(false)
                          actions.moveTask(task.id, q)
                        }}
                      >
                        {QUADRANTS[q].label}
                      </button>
                    ))}
                </div>
              )}
              {actions.onStartFocus && !isCompleted && (
                <button
                  className="context-menu-item"
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuOpen(false)
                    actions.onStartFocus(task)
                  }}
                >
                  Focus
                </button>
              )}
              <div className="context-menu-divider" />
              <button
                className="context-menu-item danger"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(false)
                  actions.deleteTask(task.id)
                }}
              >
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default TaskCard
