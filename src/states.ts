/** The six states an embed can show. `maintenance` covers the page's `maintenance` and a component's `under_maintenance`. */
export type State = 'operational' | 'degraded' | 'partial_outage' | 'major_outage' | 'maintenance' | 'unknown'

export const STATES: readonly State[] = ['operational', 'degraded', 'partial_outage', 'major_outage', 'maintenance', 'unknown']

export type Locale = 'de' | 'en'

export const LOCALES: readonly Locale[] = ['de', 'en']

/** Map any status value from status.json onto a State. Anything unexpected is `unknown`, never `operational`. */
export function toState(value: unknown): State {
  if (value === 'under_maintenance') return 'maintenance'
  return (STATES as readonly unknown[]).includes(value) ? (value as State) : 'unknown'
}

/**
 * Default texts. Same wording as the status page itself: `page` is the banner for the whole
 * page, `component` the label next to a single component.
 */
export const TEXTS: Record<Locale, { page: Record<State, string>, component: Record<State, string>, pending: string }> = {
  de: {
    page: {
      operational: 'Alle Systeme funktionsfähig',
      degraded: 'Leistungseinschränkungen',
      partial_outage: 'Teilweiser Ausfall',
      major_outage: 'Schwerer Ausfall',
      maintenance: 'Wartung',
      unknown: 'Status',
    },
    component: {
      operational: 'Funktionsfähig',
      degraded: 'Eingeschränkt',
      partial_outage: 'Teilweiser Ausfall',
      major_outage: 'Ausfall',
      maintenance: 'Wartung',
      unknown: 'Status',
    },
    pending: 'Status',
  },
  en: {
    page: {
      operational: 'All Systems Operational',
      degraded: 'Degraded Performance',
      partial_outage: 'Partial System Outage',
      major_outage: 'Major System Outage',
      maintenance: 'Under Maintenance',
      unknown: 'Status',
    },
    component: {
      operational: 'Operational',
      degraded: 'Degraded',
      partial_outage: 'Partial Outage',
      major_outage: 'Major Outage',
      maintenance: 'Under Maintenance',
      unknown: 'Status',
    },
    pending: 'Status',
  },
}

/** Attribute spelling of a state (`partial_outage` → `partial-outage`). */
export function stateAttr(state: State): string {
  return state.replace('_', '-')
}
