import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import TaskCard from './TaskCard'
import { EMPTY_MESSAGES, SORT_MODES } from '../constants'

function UnsortedTray({ tasks, actions, sortMode, onSortModeChange }) {
  const [expanded, setExpanded] = useState(true)

  const { setNodeRef, isOver } = useDroppable({
    id: 'UNSORTED',
    data: { quadrant: 'UNSORTED' }
  })

  const taskIds = tasks.map(t => t.id)
  const dragDisabled = sortMode !== 'manual'

  const trayClass = [
    'unsorted-tray',
    expanded && 'expanded',
    isOver && 'drag-over'
  ].filter(Boolean).join(' ')

  return (
    <div className={trayClass} ref={setNodeRef}>
      <div className="unsorted-header" onClick={() => setExpanded(!expanded)}>
        <div className="unsorted-header-left">
          <span className="unsorted-label">Unsorted</span>
          {tasks.length > 0 && (
            <span className="unsorted-count">{tasks.length}</span>
          )}
        </div>
        <div className="unsorted-header-right">
          <select
            className="sort-mode-select-inline"
            value={sortMode || 'manual'}
            onChange={(e) => { e.stopPropagation(); onSortModeChange('UNSORTED', e.target.value) }}
            onClick={(e) => e.stopPropagation()}
          >
            {SORT_MODES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <span className="unsorted-chevron">▼</span>
        </div>
      </div>

      {expanded && (
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <div className="unsorted-tasks">
            {tasks.length === 0 ? (
              <div className="unsorted-empty">{EMPTY_MESSAGES.UNSORTED}</div>
            ) : (
              tasks.map(task => (
                <TaskCard key={task.id} task={task} actions={actions} dragDisabled={dragDisabled} />
              ))
            )}
          </div>
          <button
            className="quadrant-add-btn"
            onClick={() => actions.onAddToQuadrant('UNSORTED')}
          >
            + Add task
          </button>
        </SortableContext>
      )}
    </div>
  )
}

export default UnsortedTray
