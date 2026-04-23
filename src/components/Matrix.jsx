import { useState, useCallback, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import TaskCard from './TaskCard'
import TaskModal from './TaskModal'
import UnsortedTray from './UnsortedTray'
import CsvImport from './CsvImport'
import SearchFilterBar from './SearchFilterBar'
import BulkActionBar from './BulkActionBar'
import { QUADRANTS, QUADRANT_IDS, EMPTY_MESSAGES, EFFORT_ORDER, SORT_MODES } from '../constants'

function sortTasks(tasks, mode) {
  if (mode === 'manual' || !mode) {
    return tasks.slice().sort((a, b) => (a.position || 0) - (b.position || 0))
  }
  if (mode === 'dueDate') {
    return tasks.slice().sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return new Date(a.dueDate) - new Date(b.dueDate)
    })
  }
  if (mode === 'effort') {
    return tasks.slice().sort((a, b) => {
      const ea = a.effort ? EFFORT_ORDER[a.effort] : 999
      const eb = b.effort ? EFFORT_ORDER[b.effort] : 999
      return ea - eb
    })
  }
  if (mode === 'timeInBucket') {
    return tasks.slice().sort((a, b) => {
      const ta = a.quadrantEnteredAt ? new Date(a.quadrantEnteredAt).getTime() : 0
      const tb = b.quadrantEnteredAt ? new Date(b.quadrantEnteredAt).getTime() : 0
      return ta - tb
    })
  }
  if (mode === 'tag') {
    return tasks.slice().sort((a, b) => {
      const tagA = (a.tags && a.tags[0]) || ''
      const tagB = (b.tags && b.tags[0]) || ''
      if (!tagA && !tagB) return 0
      if (!tagA) return 1
      if (!tagB) return -1
      return tagA.localeCompare(tagB)
    })
  }
  return tasks
}

function QuadrantColumn({ quadrantId, tasks, completedTasks, actions, overdueCount, limit, sortMode, onSortModeChange, selectMode, selectedIds, onToggleSelect }) {
  const [showCompleted, setShowCompleted] = useState(false)

  const { setNodeRef, isOver } = useDroppable({
    id: quadrantId,
    data: { quadrant: quadrantId }
  })

  const quadrant = QUADRANTS[quadrantId]
  const taskIds = tasks.map(t => t.id)
  const activeCount = tasks.length
  const atLimit = limit && activeCount >= limit
  const isFull = !!atLimit
  const dragDisabled = sortMode !== 'manual'

  return (
    <div className={`quadrant quadrant-${quadrantId} ${isOver ? 'drag-over' : ''}`}>
      <div className="quadrant-header">
        <div className="quadrant-title-group">
          <span className="quadrant-label">{quadrant.label}</span>
          <span className="quadrant-meaning">{quadrant.meaning}</span>
        </div>
        <div className="quadrant-header-right">
          <select
            className="sort-mode-select-inline"
            value={sortMode || 'manual'}
            onChange={(e) => onSortModeChange(quadrantId, e.target.value)}
            onClick={(e) => e.stopPropagation()}
          >
            {SORT_MODES.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <div className="quadrant-counts">
            {limit ? (
              <span className={`quadrant-count ${atLimit ? 'at-limit' : ''}`}>
                {activeCount} / {limit}
              </span>
            ) : (
              tasks.length > 0 && (
                <span className="quadrant-count">{tasks.length}</span>
              )
            )}
            {overdueCount > 0 && (
              <span className="overdue-count">{overdueCount} overdue</span>
            )}
          </div>
        </div>
      </div>

      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="quadrant-tasks" ref={setNodeRef}>
          {tasks.length === 0 && completedTasks.length === 0 ? (
            <div className="quadrant-empty">{EMPTY_MESSAGES[quadrantId]}</div>
          ) : (
            tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                actions={actions}
                dragDisabled={dragDisabled}
                selectMode={selectMode}
                isSelected={selectedIds?.has(task.id)}
                onToggleSelect={onToggleSelect}
              />
            ))
          )}
        </div>
      </SortableContext>

      {isFull ? (
        <div className="quadrant-add-btn disabled">Quadrant full</div>
      ) : (
        <button
          className="quadrant-add-btn"
          onClick={() => actions.onAddToQuadrant(quadrantId)}
        >
          + Add task
        </button>
      )}

      {completedTasks.length > 0 && (
        <div className="completed-section">
          <button
            className="completed-toggle"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            <span className={`completed-toggle-arrow ${showCompleted ? 'expanded' : ''}`}>▶</span>
            {completedTasks.length} completed
          </button>
          {showCompleted && (
            <div className="completed-tasks">
              {completedTasks.map(task => (
                <TaskCard key={task.id} task={task} actions={actions} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Matrix({ tasks, actions, matrixSettings, matrixName, matrixId, focusTimer }) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [defaultQuadrant, setDefaultQuadrant] = useState('UNSORTED')
  const [activeId, setActiveId] = useState(null)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [csvDragOver, setCsvDragOver] = useState(false)
  const [filterIds, setFilterIds] = useState(null)
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  const limits = matrixSettings?.limits || {}
  const sortModes = matrixSettings?.sortModes || {}

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  )

  const activeTasks = tasks.filter(t => t.status === 'active')
  const completedTasks = tasks.filter(t => t.status === 'completed')
  const hasAnyTasks = tasks.filter(t => t.status !== 'trashed').length > 0

  const allTags = useMemo(() => {
    const tagSet = new Set()
    activeTasks.forEach(t => (t.tags || []).forEach(tag => tagSet.add(tag)))
    return Array.from(tagSet).sort()
  }, [activeTasks])

  const getQuadrantTasks = (qId) => {
    let qTasks = activeTasks.filter(t => t.quadrant === qId)
    if (filterIds !== null) {
      qTasks = qTasks.filter(t => filterIds.has(t.id))
    }
    return sortTasks(qTasks, sortModes[qId] || 'manual')
  }

  const getCompletedTasks = (qId) =>
    completedTasks
      .filter(t => t.quadrant === qId)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))

  const getOverdueCount = (qId) => {
    const now = new Date()
    return activeTasks.filter(t =>
      t.quadrant === qId &&
      t.dueDate &&
      new Date(t.dueDate + 'T23:59:59') < now
    ).length
  }

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const taskId = active.id
    const activeTask = active.data?.current?.task

    if (!activeTask) return

    let targetQuadrant = over.data?.current?.quadrant
    if (!targetQuadrant) {
      const overTask = tasks.find(t => t.id === over.id)
      if (overTask) targetQuadrant = overTask.quadrant
    }

    if (!targetQuadrant) return

    if (activeTask.quadrant !== targetQuadrant) {
      actions.moveTask(taskId, targetQuadrant)
    } else if (active.id !== over.id && over.data?.current?.task) {
      const overTask = over.data.current.task
      actions.reorderTasks(taskId, targetQuadrant, overTask.position)
    }
  }, [tasks, actions])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null

  const onEdit = useCallback((task) => {
    setEditingTask(task)
    setModalOpen(true)
  }, [])

  const onAddToQuadrant = useCallback((quadrantId) => {
    setEditingTask(null)
    setDefaultQuadrant(quadrantId)
    setModalOpen(true)
  }, [])

  const handleSave = useCallback((taskId, taskData) => {
    if (taskId) {
      actions.updateTask(taskId, taskData)
    } else {
      actions.addTask(taskData)
    }
  }, [actions])

  const onStartFocus = useCallback((task) => {
    focusTimer?.start(task.id, task.title)
  }, [focusTimer])

  const onToggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleBulkMove = useCallback((quadrant) => {
    actions.bulkMoveTasks(Array.from(selectedIds), quadrant)
    setSelectedIds(new Set())
    setSelectMode(false)
  }, [actions, selectedIds])

  const handleBulkDelete = useCallback(() => {
    actions.bulkDeleteTasks(Array.from(selectedIds))
    setSelectedIds(new Set())
    setSelectMode(false)
  }, [actions, selectedIds])

  const handleBulkUpdate = useCallback((updates) => {
    if (updates.addTag) {
      // Special case: add tag to existing tags
      const ids = Array.from(selectedIds)
      ids.forEach(id => {
        const task = tasks.find(t => t.id === id)
        if (task && !(task.tags || []).includes(updates.addTag)) {
          actions.updateTask(id, { tags: [...(task.tags || []), updates.addTag] })
        }
      })
    } else {
      actions.bulkUpdateTasks(Array.from(selectedIds), updates)
    }
    setSelectedIds(new Set())
    setSelectMode(false)
  }, [actions, selectedIds, tasks])

  const exitSelectMode = useCallback(() => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }, [])

  const cardActions = {
    ...actions,
    onEdit,
    onAddToQuadrant,
    onStartFocus: focusTimer ? onStartFocus : undefined
  }

  // Global CSV file drop listener
  useEffect(() => {
    let dragCounter = 0

    const handleDragEnter = (e) => {
      e.preventDefault()
      dragCounter++
      if (e.dataTransfer.types.includes('Files')) {
        setCsvDragOver(true)
      }
    }

    const handleDragLeave = (e) => {
      e.preventDefault()
      dragCounter--
      if (dragCounter === 0) {
        setCsvDragOver(false)
      }
    }

    const handleDragOver = (e) => {
      e.preventDefault()
    }

    const handleDrop = (e) => {
      e.preventDefault()
      dragCounter = 0
      setCsvDragOver(false)

      const files = Array.from(e.dataTransfer.files)
      const csvFile = files.find(f => f.name.endsWith('.csv'))
      if (csvFile) {
        setCsvImportOpen(true)
        window.__csvDroppedFile = csvFile
      }
    }

    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('drop', handleDrop)
    }
  }, [])

  if (!hasAnyTasks) {
    return (
      <div className="matrix-page">
        <div className="matrix-header">
          <div className="matrix-header-left">
            <h1>{matrixName || 'FourSquare'}</h1>
            {matrixId && (
              <Link to={`/matrix/${matrixId}/settings`} className="matrix-settings-link">settings</Link>
            )}
          </div>
        </div>
        <div className="empty-state">
          <h2>Welcome to FourSquare</h2>
          <p>Prioritize your tasks by urgency and importance.</p>
          <div className="empty-state-actions">
            <button className="primary-btn" onClick={() => onAddToQuadrant('UNSORTED')}>
              Add your first task
            </button>
            <button className="secondary-btn" onClick={() => setCsvImportOpen(true)}>
              Or import a CSV
            </button>
          </div>
        </div>

        {modalOpen && (
          <TaskModal
            task={editingTask}
            defaultQuadrant={defaultQuadrant}
            onSave={handleSave}
            onClose={() => { setModalOpen(false); setEditingTask(null) }}
            limits={limits}
            tasks={tasks}
          />
        )}

        {csvImportOpen && (
          <CsvImport
            onImport={actions.bulkAddTasks}
            onClose={() => setCsvImportOpen(false)}
            limits={limits}
            tasks={tasks}
          />
        )}
      </div>
    )
  }

  return (
    <div className="matrix-page">
      <div className="matrix-header">
        <div className="matrix-header-left">
          <h1>{matrixName || 'FourSquare'}</h1>
          {matrixId && (
            <Link to={`/matrix/${matrixId}/settings`} className="matrix-settings-link">settings</Link>
          )}
        </div>
        <div className="matrix-header-actions">
          <button
            className={`secondary-btn ${selectMode ? 'active-mode' : ''}`}
            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
          >
            {selectMode ? 'Cancel' : 'Select'}
          </button>
          <button className="secondary-btn" onClick={() => setCsvImportOpen(true)}>
            Import CSV
          </button>
          <button className="primary-btn" onClick={() => onAddToQuadrant('UNSORTED')}>
            + Add Task
          </button>
        </div>
      </div>

      <SearchFilterBar
        tasks={tasks}
        onFilterChange={setFilterIds}
        allTags={allTags}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="matrix-grid">
          {QUADRANT_IDS.map(qId => (
            <QuadrantColumn
              key={qId}
              quadrantId={qId}
              tasks={getQuadrantTasks(qId)}
              completedTasks={getCompletedTasks(qId)}
              actions={cardActions}
              overdueCount={getOverdueCount(qId)}
              limit={limits[qId]}
              sortMode={sortModes[qId] || 'manual'}
              onSortModeChange={actions.updateQuadrantSortMode}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>

        <UnsortedTray
          tasks={getQuadrantTasks('UNSORTED')}
          actions={cardActions}
          sortMode={sortModes.UNSORTED || 'manual'}
          onSortModeChange={actions.updateQuadrantSortMode}
        />

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} actions={cardActions} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      {selectMode && selectedIds.size > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onMove={handleBulkMove}
          onDelete={handleBulkDelete}
          onUpdate={handleBulkUpdate}
          onDone={exitSelectMode}
        />
      )}

      {modalOpen && (
        <TaskModal
          task={editingTask}
          defaultQuadrant={defaultQuadrant}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingTask(null) }}
          limits={limits}
          tasks={tasks}
        />
      )}

      {csvImportOpen && (
        <CsvImport
          onImport={actions.bulkAddTasks}
          onClose={() => setCsvImportOpen(false)}
          limits={limits}
          tasks={tasks}
        />
      )}

      {csvDragOver && (
        <div className="csv-drop-overlay">
          <div className="csv-drop-overlay-inner">
            <h2>Drop CSV to import</h2>
            <p>Release to import tasks from your CSV file</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Matrix
