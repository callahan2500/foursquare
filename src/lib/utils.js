export function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export function computeNextDate(dateStr, pattern) {
  const d = new Date(dateStr + 'T00:00:00')
  if (pattern === 'daily') {
    d.setDate(d.getDate() + 1)
  } else if (pattern === 'weekly') {
    d.setDate(d.getDate() + 7)
  } else if (pattern === 'monthly') {
    d.setMonth(d.getMonth() + 1)
  }
  return d.toISOString().split('T')[0]
}
