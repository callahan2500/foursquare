import { useState, useCallback, useRef } from 'react'

const MAX_UNDO = 20

export function useUndo() {
  const stackRef = useRef([])
  const [canUndo, setCanUndo] = useState(false)

  const pushUndo = useCallback((snapshot) => {
    stackRef.current = [...stackRef.current.slice(-(MAX_UNDO - 1)), snapshot]
    setCanUndo(true)
  }, [])

  const undo = useCallback((setStateRaw) => {
    if (stackRef.current.length === 0) return null
    const prev = stackRef.current[stackRef.current.length - 1]
    stackRef.current = stackRef.current.slice(0, -1)
    setCanUndo(stackRef.current.length > 0)
    setStateRaw(prev)
    return prev
  }, [])

  return { pushUndo, undo, canUndo }
}
