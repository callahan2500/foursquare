import { useState, useEffect, useRef, useCallback } from 'react'
import { FOCUS_TIMER_KEY } from '../constants'

const FOCUS_DURATION = 25 * 60 // 25 minutes in seconds
const SHORT_BREAK = 5 * 60
const LONG_BREAK = 15 * 60

function loadTimerState() {
  try {
    const raw = localStorage.getItem(FOCUS_TIMER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function useFocusTimer() {
  const [timerState, setTimerState] = useState(() => {
    return loadTimerState() || {
      taskId: null,
      taskTitle: '',
      duration: FOCUS_DURATION,
      elapsed: 0,
      mode: 'focus', // 'focus' | 'shortBreak' | 'longBreak'
      running: false,
      sessionsCompleted: 0
    }
  })

  const intervalRef = useRef(null)

  // Tick every second when running
  useEffect(() => {
    if (timerState.running) {
      intervalRef.current = setInterval(() => {
        setTimerState(prev => {
          const next = { ...prev, elapsed: prev.elapsed + 1 }
          if (next.elapsed >= next.duration) {
            clearInterval(intervalRef.current)
            // Notification
            if (Notification.permission === 'granted') {
              new Notification('Focus Timer', {
                body: next.mode === 'focus'
                  ? `Focus session complete! ${next.taskTitle}`
                  : 'Break is over! Ready to focus?'
              })
            }
            return {
              ...next,
              running: false,
              sessionsCompleted: next.mode === 'focus'
                ? next.sessionsCompleted + 1
                : next.sessionsCompleted
            }
          }
          return next
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [timerState.running])

  // Persist
  useEffect(() => {
    if (timerState.taskId) {
      localStorage.setItem(FOCUS_TIMER_KEY, JSON.stringify(timerState))
    } else {
      localStorage.removeItem(FOCUS_TIMER_KEY)
    }
  }, [timerState])

  const start = useCallback((taskId, taskTitle) => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
    setTimerState({
      taskId,
      taskTitle,
      duration: FOCUS_DURATION,
      elapsed: 0,
      mode: 'focus',
      running: true,
      sessionsCompleted: 0
    })
  }, [])

  const pause = useCallback(() => {
    setTimerState(prev => ({ ...prev, running: false }))
  }, [])

  const resume = useCallback(() => {
    setTimerState(prev => ({ ...prev, running: true }))
  }, [])

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTimerState({
      taskId: null,
      taskTitle: '',
      duration: FOCUS_DURATION,
      elapsed: 0,
      mode: 'focus',
      running: false,
      sessionsCompleted: 0
    })
    localStorage.removeItem(FOCUS_TIMER_KEY)
  }, [])

  const startBreak = useCallback((type) => {
    setTimerState(prev => ({
      ...prev,
      mode: type,
      duration: type === 'shortBreak' ? SHORT_BREAK : LONG_BREAK,
      elapsed: 0,
      running: true
    }))
  }, [])

  const startNextFocus = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      mode: 'focus',
      duration: FOCUS_DURATION,
      elapsed: 0,
      running: true
    }))
  }, [])

  const isComplete = timerState.elapsed >= timerState.duration && !timerState.running && timerState.taskId
  const isFocusComplete = isComplete && timerState.mode === 'focus'

  return {
    timerState,
    start,
    pause,
    resume,
    stop,
    startBreak,
    startNextFocus,
    isComplete,
    isFocusComplete
  }
}
