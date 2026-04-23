import { STORAGE_KEY, LEGACY_STORAGE_KEY, DEFAULT_STATE, DEFAULT_MATRIX_SETTINGS } from '../constants'
import { generateId } from './utils'

let saveTimeout = null

export function loadState() {
  try {
    // Try v2 first
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return migrate(parsed)
      }
    }

    // Fall back to v1 and migrate
    const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw)
      if (parsed && typeof parsed === 'object') {
        const migrated = migrateV1ToV2(parsed)
        // Save as v2 and remove v1
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated))
        localStorage.removeItem(LEGACY_STORAGE_KEY)
        return migrated
      }
    }

    // Fresh state with a default matrix
    return createFreshState()
  } catch (e) {
    console.warn('Failed to load state, resetting:', e)
    return createFreshState()
  }
}

function createFreshState() {
  const now = new Date().toISOString()
  const matrixId = generateId()
  return {
    ...DEFAULT_STATE,
    activeMatrixId: matrixId,
    matrices: [{
      id: matrixId,
      name: 'Default',
      icon: '📋',
      createdAt: now,
      updatedAt: now,
      tasks: [],
      settings: { ...DEFAULT_MATRIX_SETTINGS }
    }]
  }
}

function migrateV1ToV2(v1State) {
  const now = new Date().toISOString()
  const matrixId = generateId()

  const tasks = (Array.isArray(v1State.tasks) ? v1State.tasks : []).map(t => ({
    ...t,
    links: t.links || [],
    quadrantEnteredAt: t.quadrantEnteredAt || t.createdAt || now
  }))

  const autoEscalate = v1State.settings?.autoEscalate || false

  return {
    version: 2,
    activeMatrixId: matrixId,
    matrices: [{
      id: matrixId,
      name: 'Default',
      icon: '📋',
      createdAt: now,
      updatedAt: now,
      tasks,
      settings: {
        ...DEFAULT_MATRIX_SETTINGS,
        autoEscalate
      }
    }],
    settings: {
      theme: v1State.settings?.theme || 'dark'
    }
  }
}

function migrate(state) {
  let current = { ...state }

  if (current.version < 2) {
    return migrateV1ToV2(current)
  }

  // Defensive backfill for v2 data
  if (!current.settings) current.settings = { theme: 'dark' }
  if (!current.settings.theme) current.settings.theme = 'dark'
  if (!Array.isArray(current.matrices)) current.matrices = []

  current.matrices = current.matrices.map(m => {
    const matrix = { ...m }
    if (!matrix.settings) matrix.settings = { ...DEFAULT_MATRIX_SETTINGS }
    if (!matrix.settings.limits) matrix.settings.limits = { Q1: null, Q2: null, Q3: null, Q4: null, UNSORTED: null }
    if (!matrix.settings.sortModes) matrix.settings.sortModes = { Q1: 'manual', Q2: 'manual', Q3: 'manual', Q4: 'manual', UNSORTED: 'manual' }
    if (matrix.settings.autoEscalate === undefined) matrix.settings.autoEscalate = false
    if (!Array.isArray(matrix.tasks)) matrix.tasks = []
    matrix.tasks = matrix.tasks.map(t => ({
      ...t,
      links: t.links || [],
      quadrantEnteredAt: t.quadrantEnteredAt || t.createdAt || new Date().toISOString(),
      subtasks: t.subtasks || [],
      recurrence: t.recurrence || null,
      focusMinutes: t.focusMinutes || 0
    }))
    return matrix
  })

  // Ensure activeMatrixId points to a valid matrix
  if (!current.activeMatrixId || !current.matrices.find(m => m.id === current.activeMatrixId)) {
    current.activeMatrixId = current.matrices[0]?.id || null
  }

  // If no matrices exist, create a default one
  if (current.matrices.length === 0) {
    const fresh = createFreshState()
    current.matrices = fresh.matrices
    current.activeMatrixId = fresh.activeMatrixId
  }

  return current
}

export function saveState(state) {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch (e) {
      console.error('Failed to save state:', e)
    }
  }, 200)
}

export function saveStateImmediate(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save state:', e)
  }
}

export function exportData(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `foursquare-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data || typeof data !== 'object') {
          reject(new Error('Invalid backup file'))
          return
        }

        // Handle v1 backups (flat tasks array)
        if (Array.isArray(data.tasks) && !data.matrices) {
          resolve(migrateV1ToV2(data))
          return
        }

        // Handle v2 backups
        if (Array.isArray(data.matrices)) {
          resolve(migrate(data))
          return
        }

        reject(new Error('Invalid backup file format'))
      } catch (err) {
        reject(new Error('Failed to parse backup file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}
