import { useState, useMemo } from 'react'
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell
} from 'recharts'
import { QUADRANT_IDS, QUADRANTS } from '../constants'

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

function Insights({ tasks, allMatrices, activeMatrixId }) {
  const [scope, setScope] = useState('current')

  const scopedTasks = useMemo(() => {
    if (scope === 'all') {
      return allMatrices.flatMap(m => m.tasks)
    }
    // Find specific matrix by id
    const matrix = allMatrices.find(m => m.id === scope)
    if (matrix) return matrix.tasks
    // Default: current matrix
    return tasks
  }, [scope, tasks, allMatrices])

  const allTasks = scopedTasks.filter(t => t.status !== 'trashed')
  const completedTasks = allTasks.filter(t => t.status === 'completed')
  const activeTasks = allTasks.filter(t => t.status === 'active')

  const stats = useMemo(() => {
    const now = new Date()
    const thisWeekStart = new Date(now)
    thisWeekStart.setHours(0, 0, 0, 0)
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())

    const lastWeekStart = new Date(thisWeekStart)
    lastWeekStart.setDate(lastWeekStart.getDate() - 7)

    const completedThisWeek = completedTasks.filter(t =>
      t.completedAt && new Date(t.completedAt) >= thisWeekStart
    ).length

    const completedLastWeek = completedTasks.filter(t =>
      t.completedAt &&
      new Date(t.completedAt) >= lastWeekStart &&
      new Date(t.completedAt) < thisWeekStart
    ).length

    const weekDelta = completedLastWeek === 0
      ? (completedThisWeek > 0 ? 100 : 0)
      : Math.round(((completedThisWeek - completedLastWeek) / completedLastWeek) * 100)

    const avgDays = {}
    for (const qId of QUADRANT_IDS) {
      const qCompleted = completedTasks.filter(t => t.quadrant === qId && t.completedAt && t.createdAt)
      if (qCompleted.length > 0) {
        const totalDays = qCompleted.reduce((sum, t) => {
          const diff = (new Date(t.completedAt) - new Date(t.createdAt)) / (1000 * 60 * 60 * 24)
          return sum + diff
        }, 0)
        avgDays[qId] = Math.round((totalDays / qCompleted.length) * 10) / 10
      } else {
        avgDays[qId] = null
      }
    }

    const q1Active = activeTasks.filter(t => t.quadrant === 'Q1').length
    const q2Active = activeTasks.filter(t => t.quadrant === 'Q2').length
    const q1q2Ratio = q2Active === 0
      ? (q1Active > 0 ? 'All Q1' : 'None')
      : `${q1Active}:${q2Active}`

    return { completedThisWeek, weekDelta, avgDays, q1q2Ratio }
  }, [completedTasks, activeTasks])

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

      <div className="insights-stats">
        <div className="insight-stat-card">
          <div className="insight-stat-value">{stats.completedThisWeek}</div>
          <div className="insight-stat-label">Completed this week</div>
          {stats.weekDelta !== 0 && (
            <div className={`insight-stat-delta ${stats.weekDelta > 0 ? 'positive' : 'negative'}`}>
              {stats.weekDelta > 0 ? '+' : ''}{stats.weekDelta}% vs last week
            </div>
          )}
        </div>

        <div className="insight-stat-card">
          <div className="insight-stat-value">{stats.q1q2Ratio}</div>
          <div className="insight-stat-label">Q1 : Q2 ratio</div>
          <div className="insight-stat-delta" style={{ color: 'var(--text-tertiary)' }}>
            Active tasks
          </div>
        </div>

        <div className="insight-stat-card">
          <div className="insight-stat-value">
            {stats.avgDays.Q1 !== null ? `${stats.avgDays.Q1}d` : '—'}
          </div>
          <div className="insight-stat-label">Avg days to complete (Q1)</div>
          <div className="insight-stat-delta" style={{ color: 'var(--text-tertiary)' }}>
            {stats.avgDays.Q2 !== null ? `Q2: ${stats.avgDays.Q2}d` : ''}
          </div>
        </div>
      </div>

      <div className="insights-charts">
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
