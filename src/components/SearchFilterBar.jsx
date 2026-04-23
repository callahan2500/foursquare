import { useState, useMemo } from 'react'
import { EFFORT_OPTIONS } from '../constants'

function SearchFilterBar({ tasks, onFilterChange, allTags }) {
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedTags, setSelectedTags] = useState(new Set())
  const [selectedEffort, setSelectedEffort] = useState(null)
  const [overdueOnly, setOverdueOnly] = useState(false)
  const [hasDueDate, setHasDueDate] = useState(false)

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (query.trim()) count++
    if (selectedTags.size > 0) count++
    if (selectedEffort) count++
    if (overdueOnly) count++
    if (hasDueDate) count++
    return count
  }, [query, selectedTags, selectedEffort, overdueOnly, hasDueDate])

  const applyFilters = (q, tags, effort, overdue, hasDue) => {
    const lowerQuery = q.toLowerCase().trim()

    if (!lowerQuery && tags.size === 0 && !effort && !overdue && !hasDue) {
      onFilterChange(null)
      return
    }

    const now = new Date()
    const matching = new Set()

    tasks.forEach(t => {
      if (t.status !== 'active') return

      // Text search
      if (lowerQuery) {
        const inTitle = (t.title || '').toLowerCase().includes(lowerQuery)
        const inDesc = (t.description || '').toLowerCase().includes(lowerQuery)
        const inTags = (t.tags || []).some(tag => tag.toLowerCase().includes(lowerQuery))
        if (!inTitle && !inDesc && !inTags) return
      }

      // Tag filter
      if (tags.size > 0) {
        const taskTags = t.tags || []
        if (!taskTags.some(tag => tags.has(tag))) return
      }

      // Effort filter
      if (effort && t.effort !== effort) return

      // Overdue only
      if (overdue) {
        if (!t.dueDate) return
        if (new Date(t.dueDate + 'T23:59:59') >= now) return
      }

      // Has due date
      if (hasDue && !t.dueDate) return

      matching.add(t.id)
    })

    onFilterChange(matching)
  }

  const updateQuery = (val) => {
    setQuery(val)
    applyFilters(val, selectedTags, selectedEffort, overdueOnly, hasDueDate)
  }

  const toggleTag = (tag) => {
    const next = new Set(selectedTags)
    if (next.has(tag)) next.delete(tag)
    else next.add(tag)
    setSelectedTags(next)
    applyFilters(query, next, selectedEffort, overdueOnly, hasDueDate)
  }

  const updateEffort = (val) => {
    const next = selectedEffort === val ? null : val
    setSelectedEffort(next)
    applyFilters(query, selectedTags, next, overdueOnly, hasDueDate)
  }

  const toggleOverdue = () => {
    const next = !overdueOnly
    setOverdueOnly(next)
    applyFilters(query, selectedTags, selectedEffort, next, hasDueDate)
  }

  const toggleHasDueDate = () => {
    const next = !hasDueDate
    setHasDueDate(next)
    applyFilters(query, selectedTags, selectedEffort, overdueOnly, next)
  }

  const clearAll = () => {
    setQuery('')
    setSelectedTags(new Set())
    setSelectedEffort(null)
    setOverdueOnly(false)
    setHasDueDate(false)
    onFilterChange(null)
  }

  const resultCount = useMemo(() => {
    if (activeFilterCount === 0) return null
    const q = query.toLowerCase().trim()
    const now = new Date()
    let count = 0
    tasks.forEach(t => {
      if (t.status !== 'active') return
      if (q) {
        const inTitle = (t.title || '').toLowerCase().includes(q)
        const inDesc = (t.description || '').toLowerCase().includes(q)
        const inTags = (t.tags || []).some(tag => tag.toLowerCase().includes(q))
        if (!inTitle && !inDesc && !inTags) return
      }
      if (selectedTags.size > 0) {
        if (!(t.tags || []).some(tag => selectedTags.has(tag))) return
      }
      if (selectedEffort && t.effort !== selectedEffort) return
      if (overdueOnly) {
        if (!t.dueDate) return
        if (new Date(t.dueDate + 'T23:59:59') >= now) return
      }
      if (hasDueDate && !t.dueDate) return
      count++
    })
    return count
  }, [tasks, query, selectedTags, selectedEffort, overdueOnly, hasDueDate, activeFilterCount])

  return (
    <div className="search-filter-bar">
      <div className="search-row">
        <input
          type="text"
          className="search-input"
          placeholder="Search tasks..."
          value={query}
          onChange={(e) => updateQuery(e.target.value)}
        />
        <button
          className={`filter-toggle-btn ${activeFilterCount > 0 ? 'active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters
          {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
        </button>
        {activeFilterCount > 0 && (
          <>
            <span className="filter-result-count">{resultCount} result{resultCount !== 1 ? 's' : ''}</span>
            <button className="filter-clear-btn" onClick={clearAll}>Clear</button>
          </>
        )}
      </div>

      {showFilters && (
        <div className="filter-panel">
          {allTags.length > 0 && (
            <div className="filter-group">
              <div className="filter-group-label">Tags</div>
              <div className="filter-pills">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    className={`filter-pill ${selectedTags.has(tag) ? 'selected' : ''}`}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="filter-group">
            <div className="filter-group-label">Effort</div>
            <div className="filter-pills">
              {EFFORT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  className={`filter-pill ${selectedEffort === opt.value ? 'selected' : ''}`}
                  onClick={() => updateEffort(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-group-label">Status</div>
            <div className="filter-pills">
              <button
                className={`filter-pill ${overdueOnly ? 'selected' : ''}`}
                onClick={toggleOverdue}
              >
                Overdue only
              </button>
              <button
                className={`filter-pill ${hasDueDate ? 'selected' : ''}`}
                onClick={toggleHasDueDate}
              >
                Has due date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SearchFilterBar
