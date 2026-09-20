// Ordered worst -> best. A third-party "Graded" slab outranks a
// self-assessed "Near Mint" since it's a verified, not self-reported,
// condition — the grade itself (1-10) is recorded separately.
export const CONDITIONS = [
  { id: 'HP', label: 'Heavily Played' },
  { id: 'MP', label: 'Moderately Played' },
  { id: 'LP', label: 'Lightly Played' },
  { id: 'NM', label: 'Near Mint' },
  { id: 'graded', label: 'Graded' },
]

export const CONDITION_IDS = CONDITIONS.map((c) => c.id)
export const CONDITION_LABEL = Object.fromEntries(CONDITIONS.map((c) => [c.id, c.label]))
export const MIN_GRADE = 1
export const MAX_GRADE = 10
