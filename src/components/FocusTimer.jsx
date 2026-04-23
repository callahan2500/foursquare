function FocusTimer({ timer, addFocusMinutes }) {
  const { timerState, pause, resume, stop, startBreak, startNextFocus, isFocusComplete } = timer

  if (!timerState.taskId) return null

  const remaining = Math.max(0, timerState.duration - timerState.elapsed)
  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const isComplete = timerState.elapsed >= timerState.duration && !timerState.running

  const handleStop = () => {
    // Credit partial focus time
    if (timerState.mode === 'focus' && timerState.elapsed > 0) {
      const mins = Math.round(timerState.elapsed / 60)
      if (mins > 0) addFocusMinutes(timerState.taskId, mins)
    }
    stop()
  }

  const handleBreak = (type) => {
    // Credit focus time on completion
    if (isFocusComplete) {
      addFocusMinutes(timerState.taskId, 25)
    }
    startBreak(type)
  }

  const handleNextFocus = () => {
    startNextFocus()
  }

  const modeLabel = timerState.mode === 'focus' ? 'Focus'
    : timerState.mode === 'shortBreak' ? 'Short Break'
    : 'Long Break'

  return (
    <div className="focus-timer-widget">
      <div className="focus-timer-mode">{modeLabel}</div>
      <div className="focus-timer-task" title={timerState.taskTitle}>
        {timerState.taskTitle}
      </div>
      <div className="focus-timer-display">{display}</div>

      <div className="focus-timer-controls">
        {isComplete ? (
          timerState.mode === 'focus' ? (
            <>
              <button className="focus-btn" onClick={() => handleBreak('shortBreak')}>Short Break</button>
              <button className="focus-btn" onClick={() => handleBreak('longBreak')}>Long Break</button>
              <button className="focus-btn" onClick={handleNextFocus}>Next Focus</button>
            </>
          ) : (
            <button className="focus-btn" onClick={handleNextFocus}>Start Focus</button>
          )
        ) : (
          <>
            {timerState.running ? (
              <button className="focus-btn" onClick={pause}>Pause</button>
            ) : (
              <button className="focus-btn" onClick={resume}>Resume</button>
            )}
          </>
        )}
        <button className="focus-btn stop" onClick={handleStop}>Stop</button>
      </div>

      {timerState.sessionsCompleted > 0 && (
        <div className="focus-timer-sessions">{timerState.sessionsCompleted} session{timerState.sessionsCompleted !== 1 ? 's' : ''}</div>
      )}
    </div>
  )
}

export default FocusTimer
