export const QUADRANTS = {
  Q1: { id: 'Q1', label: 'Do Now', meaning: 'Urgent + Important', accent: 'q1' },
  Q2: { id: 'Q2', label: 'Schedule', meaning: 'Important, Not Urgent', accent: 'q2' },
  Q3: { id: 'Q3', label: 'Delegate', meaning: 'Urgent, Not Important', accent: 'q3' },
  Q4: { id: 'Q4', label: 'Eliminate', meaning: 'Neither', accent: 'q4' },
  UNSORTED: { id: 'UNSORTED', label: 'Unsorted', meaning: 'Needs triage', accent: 'neutral' }
}

export const QUADRANT_IDS = ['Q1', 'Q2', 'Q3', 'Q4']

export const EFFORT_OPTIONS = [
  { value: 'XS', label: 'XS' },
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' }
]

export const EFFORT_ORDER = { XS: 0, S: 1, M: 2, L: 3, XL: 4 }

export const SORT_MODES = [
  { value: 'manual', label: 'Manual' },
  { value: 'dueDate', label: 'Due Date' },
  { value: 'effort', label: 'Effort' },
  { value: 'timeInBucket', label: 'Time in Bucket' },
  { value: 'tag', label: 'Tag' }
]

export const MATRIX_ICONS = [
  '📋', '💼', '🏠', '🎯', '🧠', '💪', '📚', '🎨',
  '🚀', '🔧', '💡', '🌱', '❤️', '⭐', '🎮', '🏃'
]

export const EMPTY_MESSAGES = {
  Q1: 'Urgent & important tasks go here — crises, deadlines, emergencies.',
  Q2: 'Important but not urgent — goals, planning, personal growth.',
  Q3: 'Urgent but less important — delegate or batch these.',
  Q4: 'Distractions and time-wasters to minimize or cut.',
  UNSORTED: 'All sorted. Add a task to triage it here.'
}

export const QUADRANT_TOOLTIPS = {
  Q1: 'Tasks that need immediate attention — e.g. a client deadline tomorrow, a server outage, a sick-day pickup.',
  Q2: 'High-value work you plan ahead — e.g. learning a new skill, writing a proposal, exercising regularly.',
  Q3: 'Interruptions that feel urgent but aren\'t yours to own — e.g. most emails, some meetings, favors you could delegate.',
  Q4: 'Low-value activities to cut — e.g. mindless scrolling, unnecessary meetings, busy-work with no outcome.'
}

export const DEFAULT_MATRIX_SETTINGS = {
  autoEscalate: false,
  limits: { Q1: null, Q2: null, Q3: null, Q4: null, UNSORTED: null },
  sortModes: { Q1: 'manual', Q2: 'manual', Q3: 'manual', Q4: 'manual', UNSORTED: 'manual' }
}

export const RECURRENCE_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' }
]

export const FOCUS_TIMER_KEY = 'foursquare_focus_timer'

export const LEGACY_STORAGE_KEY = 'eisenhower_matrix_v1'
export const STORAGE_KEY = 'eisenhower_matrix_v2'

export const DEFAULT_STATE = {
  version: 2,
  activeMatrixId: null,
  matrices: [],
  settings: {
    theme: 'dark',
    hasSeenOnboarding: false
  }
}
