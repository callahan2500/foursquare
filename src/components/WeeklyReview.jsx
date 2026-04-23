import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { QUADRANTS } from '../constants'

const STEPS = [
  { num: 1, title: 'Completed' },
  { num: 2, title: 'Overdue' },
  { num: 3, title: 'Q1 Review' },
  { num: 4, title: 'Q2 Planning' }
]

function WeeklyReview({ tasks, actions, matrixId }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [reviewStats, setReviewStats] = useState({ snoozed: 0, moved: 0, completed: 0, deleted: 0, promoted: 0 })

  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const completedThisWeek = useMemo(() =>
    tasks.filter(t =>
      t.status === 'completed' &&
      t.completedAt &&
      new Date(t.completedAt) >= sevenDaysAgo
    ).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)),
    [tasks] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const overdueTasks = useMemo(() =>
    tasks.filter(t =>
      t.status === 'active' &&
      t.dueDate &&
      new Date(t.dueDate + 'T23:59:59') < now
    ).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)),
    [tasks] // eslint-disable-line react-hooks/exhaustive-deps
  )

  const q1Tasks = useMemo(() =>
    tasks.filter(t => t.status === 'active' && t.quadrant === 'Q1')
      .sort((a, b) => (a.position || 0) - (b.position || 0)),
    [tasks]
  )

  const q2Tasks = useMemo(() =>
    tasks.filter(t => t.status === 'active' && t.quadrant === 'Q2')
      .sort((a, b) => (a.position || 0) - (b.position || 0)),
    [tasks]
  )

  const snooze = (id) => {
    const task = tasks.find(t => t.id === id)
    if (!task || !task.dueDate) return
    const d = new Date(task.dueDate + 'T00:00:00')
    d.setDate(d.getDate() + 7)
    const newDate = d.toISOString().split('T')[0]
    actions.updateTask(id, { dueDate: newDate })
    setReviewStats(s => ({ ...s, snoozed: s.snoozed + 1 }))
  }

  const moveTask = (id, quadrant) => {
    actions.moveTask(id, quadrant)
    setReviewStats(s => ({ ...s, moved: s.moved + 1 }))
  }

  const completeTask = (id) => {
    actions.completeTask(id)
    setReviewStats(s => ({ ...s, completed: s.completed + 1 }))
  }

  const deleteTask = (id) => {
    actions.deleteTask(id)
    setReviewStats(s => ({ ...s, deleted: s.deleted + 1 }))
  }

  const promoteToQ1 = (id) => {
    actions.moveTask(id, 'Q1')
    setReviewStats(s => ({ ...s, promoted: s.promoted + 1 }))
  }

  const demoteToQ2 = (id) => {
    actions.moveTask(id, 'Q2')
    setReviewStats(s => ({ ...s, moved: s.moved + 1 }))
  }

  const done = () => {
    navigate(`/matrix/${matrixId}`)
  }

  const isLastStep = step === 4
  const isSummary = step === 5

  return (
    <div className="weekly-review">
      <h1>Weekly Review</h1>

      {!isSummary && (
        <div className="review-progress">
          {STEPS.map(s => (
            <div
              key={s.num}
              className={`review-step-dot ${step === s.num ? 'active' : ''} ${step > s.num ? 'done' : ''}`}
              onClick={() => setStep(s.num)}
            >
              <span className="step-num">{s.num}</span>
              <span className="step-label">{s.title}</span>
            </div>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="review-section">
          <h2>Completed This Week</h2>
          <p className="review-subtitle">{completedThisWeek.length} task{completedThisWeek.length !== 1 ? 's' : ''} completed</p>
          {completedThisWeek.length === 0 ? (
            <div className="review-empty">No tasks completed this week.</div>
          ) : (
            <div className="review-task-list">
              {completedThisWeek.map(t => (
                <div key={t.id} className="review-task-item">
                  <div className="review-task-info">
                    <span className="review-task-title completed-text">{t.title}</span>
                    <span className="review-task-meta">
                      {QUADRANTS[t.quadrant]?.label} &middot; {new Date(t.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="review-nav">
            <button className="primary-btn" onClick={() => setStep(2)}>Next: Overdue</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="review-section">
          <h2>Overdue Tasks</h2>
          <p className="review-subtitle">{overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''}</p>
          {overdueTasks.length === 0 ? (
            <div className="review-empty">No overdue tasks!</div>
          ) : (
            <div className="review-task-list">
              {overdueTasks.map(t => (
                <div key={t.id} className="review-task-item">
                  <div className="review-task-info">
                    <span className="review-task-title">{t.title}</span>
                    <span className="review-task-meta">
                      {QUADRANTS[t.quadrant]?.label} &middot; Due {t.dueDate}
                    </span>
                  </div>
                  <div className="review-task-actions">
                    <button className="review-btn" onClick={() => snooze(t.id)}>Snooze +7d</button>
                    <button className="review-btn" onClick={() => moveTask(t.id, 'Q1')}>→ Q1</button>
                    <button className="review-btn" onClick={() => moveTask(t.id, 'Q2')}>→ Q2</button>
                    <button className="review-btn green" onClick={() => completeTask(t.id)}>Complete</button>
                    <button className="review-btn danger" onClick={() => deleteTask(t.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="review-nav">
            <button className="secondary-btn" onClick={() => setStep(1)}>Back</button>
            <button className="primary-btn" onClick={() => setStep(3)}>Next: Q1 Review</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="review-section">
          <h2>Q1 Review — Do Now</h2>
          <p className="review-subtitle">{q1Tasks.length} active task{q1Tasks.length !== 1 ? 's' : ''}</p>
          {q1Tasks.length === 0 ? (
            <div className="review-empty">No active Q1 tasks.</div>
          ) : (
            <div className="review-task-list">
              {q1Tasks.map(t => (
                <div key={t.id} className="review-task-item">
                  <div className="review-task-info">
                    <span className="review-task-title">{t.title}</span>
                    <span className="review-task-meta">
                      {t.dueDate ? `Due ${t.dueDate}` : 'No due date'}
                      {t.effort ? ` · ${t.effort}` : ''}
                    </span>
                  </div>
                  <div className="review-task-actions">
                    <button className="review-btn" onClick={() => demoteToQ2(t.id)}>→ Q2</button>
                    <button className="review-btn green" onClick={() => completeTask(t.id)}>Complete</button>
                    <button className="review-btn danger" onClick={() => deleteTask(t.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="review-nav">
            <button className="secondary-btn" onClick={() => setStep(2)}>Back</button>
            <button className="primary-btn" onClick={() => setStep(4)}>Next: Q2 Planning</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="review-section">
          <h2>Q2 Planning — Schedule</h2>
          <p className="review-subtitle">{q2Tasks.length} active task{q2Tasks.length !== 1 ? 's' : ''}</p>
          {q2Tasks.length === 0 ? (
            <div className="review-empty">No active Q2 tasks.</div>
          ) : (
            <div className="review-task-list">
              {q2Tasks.map(t => (
                <div key={t.id} className="review-task-item">
                  <div className="review-task-info">
                    <span className="review-task-title">{t.title}</span>
                    <span className="review-task-meta">
                      {t.dueDate ? `Due ${t.dueDate}` : 'No due date'}
                      {t.effort ? ` · ${t.effort}` : ''}
                    </span>
                  </div>
                  <div className="review-task-actions">
                    <button className="review-btn" onClick={() => promoteToQ1(t.id)}>→ Q1</button>
                    <button className="review-btn green" onClick={() => completeTask(t.id)}>Complete</button>
                    <button className="review-btn danger" onClick={() => deleteTask(t.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="review-nav">
            <button className="secondary-btn" onClick={() => setStep(3)}>Back</button>
            <button className="primary-btn" onClick={() => setStep(5)}>Finish Review</button>
          </div>
        </div>
      )}

      {isSummary && (
        <div className="review-section review-summary">
          <h2>Review Complete</h2>
          <div className="review-summary-stats">
            {reviewStats.completed > 0 && <div className="summary-stat">Completed: {reviewStats.completed}</div>}
            {reviewStats.snoozed > 0 && <div className="summary-stat">Snoozed: {reviewStats.snoozed}</div>}
            {reviewStats.promoted > 0 && <div className="summary-stat">Promoted to Q1: {reviewStats.promoted}</div>}
            {reviewStats.moved > 0 && <div className="summary-stat">Moved: {reviewStats.moved}</div>}
            {reviewStats.deleted > 0 && <div className="summary-stat">Deleted: {reviewStats.deleted}</div>}
            {Object.values(reviewStats).every(v => v === 0) && (
              <div className="summary-stat">No changes made during review.</div>
            )}
          </div>
          <div className="review-nav">
            <button className="primary-btn" onClick={done}>Done — Back to Matrix</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default WeeklyReview
