import { useEffect } from 'react'

function Toast({ message, onDismiss, duration = 2000 }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, duration)
    return () => clearTimeout(t)
  }, [onDismiss, duration])

  return (
    <div className="toast" onClick={onDismiss}>
      {message}
    </div>
  )
}

export default Toast
