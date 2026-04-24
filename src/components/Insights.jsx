import { useState, useMemo } from 'react'
import {
  BarChart, Bar, AreaChart, Area, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell
} from 'recharts'
import { QUADRANT_IDS, QUADRANTS, EFFORT_OPTIONS } from '../constants'

const Q_COLORS = {
  Q1: '#f85149',
  Q2: '#58a6ff',
  Q3: '#d29922',
  Q4: '#8b949e'
}

function getWeekLabel(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getWeekStart(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function CompletionHeatmap({ completedTasks }) {
  const heatmapData = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Build a map of date -> completion count (Q1 tasks only)
    const countByDate = {}
    completedTasks.forEach(t => {
      if (t.quadrant !== 'Q1' || !t.completedAt) return
      const dateKey = new Date(t.completedAt).toISOString().split('T')[0]
      countByDate[dateKey] = (countByDate[dateKey] || 0) + 1
    })

    // Generate 365 days going back from today
    const days = []
    for (let i = 364; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      days.push({
        date: dateStr,
        count: countByDate[dateStr] || 0,
        dayOfWeek: d.getDay(), // 0=Sun, 6=Sat
        month: d.getMonth(),
        year: d.getFullYear()
      })
    }

    // Organize into columns (weeks). Each column has 7 rows (Sun=0 .. Sat=6)
    const weeks = []
    let currentWeek = new Array(7).fill(null)
    let prevWeekStart = null

    days.forEach(day => {
      const d = new Date(day.date + 'T00:00:00')
      const weekStart = getWeekStart(d).toISOString().split('T')[0]

      if (prevWeekStart !== null && weekStart !== prevWeekStart) {
        weeks.push(currentWeek)
        currentWeek = new Array(7).fill(null)
      }
      currentWeek[day.dayOfWeek] = day
      prevWeekStart = weekStart
    })
    weeks.push(currentWeek)

    // Month labels: find which column index starts each month
    const monthLabels = []
    let lastMonth = null
    weeks.forEach((week, colIdx) => {
      for (const day of week) {
        if (day && (lastMonth === null || day.month !== lastMonth)) {
          monthLabels.push({
            col: colIdx,
            label: new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })
          })
          lastMonth = day.month
          break
        }
      }
    })

    return { weeks, monthLabels }
  }, [completedTasks])

  const getIntensity = (count) => {
    if (count === 0) return 0
    if (count === 1) return 1
    if (count === 2) return 2
    if (count === 3) return 3
    return 4
  }

  return (
    <div className="insight-chart-card full-width">
      <h3>Q1 Completion Heatmap (365 days)</h3>
      <div className="heatmap-container">
        <div className="heatmap-month-labels" style={{ gridTemplateColumns: `repeat(${heatmapData.weeks.length}, 14px)` }}>
          {heatmapData.monthLabels.map((m, i) => (
            <span key={i} style={{ gridColumn: m.col + 1 }}>{m.label}</span>
          ))}
        </div>
        <div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${heatmapData.weeks.length}, 12px)` }}>
          {/* Render column-by-column, row 0..6 for each column */}
          {Array.from({ length: 7 }).map((_, row) =>
            heatmapData.weeks.map((week, col) => {
              const day = week[row]
              if (!day) return <div key={`${row}-${col}`} className="heatmap-cell empty" />
              return (
                <div
                  key={`${row}-${col}`}
                  className={`heatmap-cell intensity-${getIntensity(day.count)}`}
                  title={`${day.date}: ${day.count} completion${day.count !== 1 ? 's' : ''}`}
                  style={{ gridRow: row + 1, gridColumn: col + 1 }}
                />
              )
            })
          )}
        </div>
        <div className="heatmap-legend">
          <span className="heatmap-legend-label">Less</span>
          <div className="heatmap-cell intensity-0" />
          <div className="heatmap-cell intensity-1" />
          <div className="heatmap-cell intensity-2" />
          <div className="heatmap-cell intensity-3" />
          <div className="heatmap-cell intensity-4" />
          <span className="heatmap-legend-label">More</span>
        </div>
      </div>
    </div>
  )
}

function Insights({ tasks, allMatrices, activeMatrixId }) {
  const [scope, setScope] = useState('current')

  const scopedTasks = useMemo(() => {
    if (scope === 'all') {
      return allMatrices.flatMap(m => m.tasks)
    }
    const matrix = allMatrices.find(m => m.id === scope)
    if (matrix) return matrix.tasks
    return tasks
  }, [scope, tasks, allMatrices])

  const allTasks = scopedTasks.filter(t => t.status !== 'trashed')
  const completedTasks = allTasks.filter(t => t.status === 'completed')
  const activeTasks = allTasks.filter(t => t.status === 'active')

  // ——— Stats ———
  const stats = useMemo(() => {
    const now = new Date()
    const thisWeekStart = getWeekStart(now)

    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)

    const completedThisWeek = completedTasks.filter(t =>
      t.completedAt && new Date(t.completedAt) >= thisWeekStart
    )
    const completedThisWeekCount = completedThisWeek.length

    const completedLastWeek = completedTasks.filter(t =>
      t.completedAt &&
      new Date(t.completedAt) >= lastWeekStart &&
      new Date(t.completedAt) < thisWeekStart
    ).length

    const weekDelta = completedLastWeek === 0
      ? (completedThisWeekCount > 0 ? 100 : 0)
      : Math.round(((completedThisWeekCount - completedLastWeek) / completedLastWeek) * 100)

    // Total Active
    const totalActive = activeTasks.length

    // Overdue count
    const overdueCount = activeTasks.filter(t => {
      if (!t.dueDate) return false
      const due = new Date(t.dueDate + 'T23:59:59')
      return now > due
    }).length

    // Focus This Week — sum focusMinutes on tasks completed this week
    const focusThisWeek = completedThisWeek.reduce((sum, t) => sum + (t.focusMinutes || 0), 0)

    // Avg Days to Complete (across all quadrants)
    const withDates = completedTasks.filter(t => t.completedAt && t.createdAt)
    const avgDaysAll = withDates.length > 0
      ? Math.round(withDates.reduce((sum, t) => {
          return sum + (new Date(t.completedAt) - new Date(t.createdAt)) / (1000 * 60 * 60 * 24)
        }, 0) / withDates.length * 10) / 10
      : null

    // Streak — consecutive days with ≥1 completion, counting back from today
    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const completionDates = new Set(
      completedTasks
        .filter(t => t.completedAt)
        .map(t => new Date(t.completedAt).toISOString().split('T')[0])
    )
    for (let i = 0; i < 365; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      if (completionDates.has(dateStr)) {
        streak++
      } else {
        break
      }
    }

    return { completedThisWeekCount, weekDelta, totalActive, overdueCount, focusThisWeek, avgDaysAll, streak }
  }, [completedTasks, activeTasks])

  // ——— Quadrant Distribution (existing, 8 weeks) ———
  const distributionData = useMemo(() => {
    const weeks = []
    const now = new Date()
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + i * 7))
      weeks.push(weekStart.toISOString().split('T')[0])
    }

    return weeks.map(weekStr => {
      const weekDate = new Date(weekStr + 'T00:00:00')
      const weekEnd = new Date(weekDate)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const entry = { week: getWeekLabel(weekStr) }
      for (const qId of QUADRANT_IDS) {
        entry[qId] = allTasks.filter(t => {
          const created = new Date(t.createdAt)
          if (created > weekEnd) return false
          if (t.quadrant !== qId) return false
          if (t.status === 'completed' && t.completedAt) {
            const completed = new Date(t.completedAt)
            return completed > weekDate
          }
          return true
        }).length
      }
      return entry
    })
  }, [allTasks])

  // ——— Completion Rate by Quadrant (existing) ———
  const completionData = useMemo(() => {
    return QUADRANT_IDS.map(qId => {
      const qTasks = allTasks.filter(t => t.quadrant === qId)
      const completed = qTasks.filter(t => t.status === 'completed').length
      const total = qTasks.length
      return {
        name: QUADRANTS[qId].label,
        quadrant: qId,
        rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        completed,
        total
      }
    })
  }, [allTasks])

  // ——— Overdue Aging (existing) ———
  const overdueData = useMemo(() => {
    const now = new Date()
    const buckets = { '1-3d': 0, '4-7d': 0, '8+d': 0 }

    activeTasks.forEach(t => {
      if (!t.dueDate) return
      const due = new Date(t.dueDate + 'T23:59:59')
      const daysDiff = Math.floor((now - due) / (1000 * 60 * 60 * 24))
      if (daysDiff <= 0) return
      if (daysDiff <= 3) buckets['1-3d']++
      else if (daysDiff <= 7) buckets['4-7d']++
      else buckets['8+d']++
    })

    return Object.entries(buckets).map(([range, count]) => ({ range, count }))
  }, [activeTasks])

  // ——— Top Tags (existing) ———
  const tagData = useMemo(() => {
    const tagMap = {}
    allTasks.forEach(t => {
      if (!t.tags) return
      t.tags.forEach(tag => {
        if (!tagMap[tag]) tagMap[tag] = { total: 0, completed: 0 }
        tagMap[tag].total++
        if (t.status === 'completed') tagMap[tag].completed++
      })
    })

    return Object.entries(tagMap)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 5)
      .map(([tag, data]) => ({
        tag,
        total: data.total,
        completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0
      }))
  }, [allTasks])

  // ——— Weekly Completion Trend (new, 8 weeks) ———
  const weeklyCompletionData = useMemo(() => {
    const now = new Date()
    const data = []
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + i * 7))
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const count = completedTasks.filter(t => {
        if (!t.completedAt) return false
        const d = new Date(t.completedAt)
        return d >= weekStart && d < weekEnd
      }).length

      data.push({
        week: getWeekLabel(weekStart.toISOString().split('T')[0]),
        completed: count
      })
    }
    return data
  }, [completedTasks])

  // ——— Created vs Completed (new, 8 weeks) ———
  const createdVsCompletedData = useMemo(() => {
    const now = new Date()
    const data = []
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + i * 7))
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const created = allTasks.filter(t => {
        const d = new Date(t.createdAt)
        return d >= weekStart && d < weekEnd
      }).length

      const completed = completedTasks.filter(t => {
        if (!t.completedAt) return false
        const d = new Date(t.completedAt)
        return d >= weekStart && d < weekEnd
      }).length

      data.push({
        week: getWeekLabel(weekStart.toISOString().split('T')[0]),
        created,
        completed
      })
    }
    return data
  }, [allTasks, completedTasks])

  // ——— Effort Distribution (new) ———
  const effortData = useMemo(() => {
    const effortCounts = {}
    EFFORT_OPTIONS.forEach(e => { effortCounts[e.value] = 0 })
    activeTasks.forEach(t => {
      if (t.effort && effortCounts[t.effort] !== undefined) {
        effortCounts[t.effort]++
      }
    })
    return EFFORT_OPTIONS.map(e => ({
      effort: e.value,
      count: effortCounts[e.value]
    }))
  }, [activeTasks])

  // ——— Focus Time Trend (new, 8 weeks) ———
  const focusTrendData = useMemo(() => {
    const now = new Date()
    const data = []
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + i * 7))
      weekStart.setHours(0, 0, 0, 0)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      const minutes = completedTasks.filter(t => {
        if (!t.completedAt) return false
        const d = new Date(t.completedAt)
        return d >= weekStart && d < weekEnd
      }).reduce((sum, t) => sum + (t.focusMinutes || 0), 0)

      data.push({
        week: getWeekLabel(weekStart.toISOString().split('T')[0]),
        minutes
      })
    }
    return data
  }, [completedTasks])

  if (allTasks.length === 0) {
    return (
      <div className="insights">
        <div className="insights-header">
          <h1>Insights</h1>
          {allMatrices.length > 1 && (
            <div className="scope-toggle">
              <button
                className={`scope-btn ${scope === 'current' ? 'active' : ''}`}
                onClick={() => setScope('current')}
              >
                Current Matrix
              </button>
              <button
                className={`scope-btn ${scope === 'all' ? 'active' : ''}`}
                onClick={() => setScope('all')}
              >
                All Matrices
              </button>
            </div>
          )}
        </div>
        <div className="insights-empty">
          <h2>No data yet</h2>
          <p>Add some tasks to your matrix to see insights here.</p>
        </div>
      </div>
    )
  }

  const tooltipStyle = {
    backgroundColor: 'var(--bg-secondary)',
    border: '1px solid var(--border-primary)',
    borderRadius: '6px',
    color: 'var(--text-primary)',
    fontSize: '0.8rem'
  }

  return (
    <div className="insights">
      <div className="insights-header">
        <h1>Insights</h1>
        {allMatrices.length > 0 && (
          <select
            className="scope-select"
            value={scope}
            onChange={(e) => setScope(e.target.value)}
          >
            <option value="current">Current Matrix</option>
            {allMatrices.map(m => (
              <option key={m.id} value={m.id}>{m.icon} {m.name}</option>
            ))}
            <option value="all">All Matrices</option>
          </select>
        )}
      </div>

      {/* ——— 6 Stat Cards (2 rows of 3) ——— */}
      <div className="insights-stats">
        <div className="insight-stat-card">
          <div className="insight-stat-value">{stats.completedThisWeekCount}</div>
          <div className="insight-stat-label">Completed this week</div>
          {stats.weekDelta !== 0 && (
            <div className={`insight-stat-delta ${stats.weekDelta > 0 ? 'positive' : 'negative'}`}>
              {stats.weekDelta > 0 ? '+' : ''}{stats.weekDelta}% vs last week
            </div>
          )}
        </div>

        <div className="insight-stat-card">
          <div className="insight-stat-value">{stats.totalActive}</div>
          <div className="insight-stat-label">Total Active</div>
          <div className="insight-stat-delta" style={{ color: 'var(--text-tertiary)' }}>
            tasks in progress
          </div>
        </div>

        <div className="insight-stat-card">
          <div className="insight-stat-value" style={stats.overdueCount > 0 ? { color: 'var(--accent-red)' } : undefined}>
            {stats.overdueCount}
          </div>
          <div className="insight-stat-label">Overdue</div>
          <div className="insight-stat-delta" style={{ color: stats.overdueCount > 0 ? 'var(--accent-red)' : 'var(--text-tertiary)' }}>
            {stats.overdueCount > 0 ? 'need attention' : 'all on track'}
          </div>
        </div>

        <div className="insight-stat-card">
          <div className="insight-stat-value">{stats.focusThisWeek}m</div>
          <div className="insight-stat-label">Focus This Week</div>
          <div className="insight-stat-delta" style={{ color: 'var(--text-tertiary)' }}>
            on completed tasks
          </div>
        </div>

        <div className="insight-stat-card">
          <div className="insight-stat-value">
            {stats.avgDaysAll !== null ? `${stats.avgDaysAll}d` : '—'}
          </div>
          <div className="insight-stat-label">Avg Days to Complete</div>
          <div className="insight-stat-delta" style={{ color: 'var(--text-tertiary)' }}>
            across all quadrants
          </div>
        </div>

        <div className="insight-stat-card">
          <div className="insight-stat-value">{stats.streak}d</div>
          <div className="insight-stat-label">Streak</div>
          <div className="insight-stat-delta" style={{ color: 'var(--text-tertiary)' }}>
            consecutive days
          </div>
        </div>
      </div>

      {/* ——— Charts ——— */}
      <div className="insights-charts">

        {/* Q1 Completion Heatmap */}
        <CompletionHeatmap completedTasks={completedTasks} />

        {/* Weekly Completion Trend (new, full-width) */}
        <div className="insight-chart-card full-width">
          <h3>Weekly Completion Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={weeklyCompletionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="week" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="completed"
                stroke="var(--accent-green)"
                strokeWidth={2}
                dot={{ fill: 'var(--accent-green)', r: 4 }}
                name="Completed"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Created vs Completed (new, full-width) */}
        <div className="insight-chart-card full-width">
          <h3>Created vs Completed</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={createdVsCompletedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="week" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="created" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} name="Created" />
              <Bar dataKey="completed" fill="var(--accent-green)" radius={[4, 4, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quadrant Distribution 8-week (existing, full-width) */}
        <div className="insight-chart-card full-width">
          <h3>Quadrant Distribution (8 weeks)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="week" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              {QUADRANT_IDS.map(qId => (
                <Area
                  key={qId}
                  type="monotone"
                  dataKey={qId}
                  stackId="1"
                  fill={Q_COLORS[qId]}
                  stroke={Q_COLORS[qId]}
                  fillOpacity={0.6}
                  name={QUADRANTS[qId].label}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Completion Rate by Quadrant (half) */}
        <div className="insight-chart-card">
          <h3>Completion Rate by Quadrant</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={completionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} unit="%" />
              <Tooltip contentStyle={tooltipStyle} formatter={(val) => `${val}%`} />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {completionData.map((entry) => (
                  <Cell key={entry.quadrant} fill={Q_COLORS[entry.quadrant]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Overdue Aging (half) */}
        <div className="insight-chart-card">
          <h3>Overdue Aging</h3>
          {overdueData.every(d => d.count === 0) ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
              No overdue tasks
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={overdueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="range" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--q1-accent)" radius={[4, 4, 0, 0]} name="Tasks" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Effort Distribution (new, half) */}
        <div className="insight-chart-card">
          <h3>Effort Distribution</h3>
          {effortData.every(d => d.count === 0) ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
              No effort data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={effortData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
                <YAxis dataKey="effort" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} width={30} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--accent-primary)" radius={[0, 4, 4, 0]} name="Active Tasks" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Focus Time Trend (new, half) */}
        <div className="insight-chart-card">
          <h3>Focus Time Trend</h3>
          {focusTrendData.every(d => d.minutes === 0) ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
              No focus data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={focusTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="week" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(val) => `${val}m`} />
                <Bar dataKey="minutes" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} name="Focus Minutes" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Tags (existing, full-width) */}
        {tagData.length > 0 && (
          <div className="insight-chart-card full-width">
            <h3>Top Tags</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tagData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                <YAxis dataKey="tag" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} width={80} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="total" fill="var(--accent-primary)" radius={[0, 4, 4, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

export default Insights
