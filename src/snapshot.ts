import { type State, toState } from './states'

/** The parts of a status page's /status.json the embed reads. */
export interface Snapshot {
  page: { id: string, name: string, url: string, locale: string, updated_at: string }
  status: { indicator: string, description: string }
  components: Array<{ id: string, name: string, status: string, is_group: boolean, group_id: string | null }>
  incidents?: Array<{ id: string, name: string, status: string, severity: string, started_at: string }>
  maintenances?: Array<{ id: string, name: string, status: string, scheduled_start: string, scheduled_end: string | null }>
}

/** Reject anything that is not a status.json, so a wrong host shows "unknown" instead of crashing. */
export function isSnapshot(value: unknown): value is Snapshot {
  const v = value as Snapshot | null
  return !!v
    && typeof v === 'object'
    && typeof v.page?.url === 'string'
    && typeof v.status?.indicator === 'string'
    && Array.isArray(v.components)
}

export interface Resolved {
  state: State
  /** Component name, or the page name for a page embed. */
  name: string
  url: string
}

/** The state to show: the whole page, or one component when `componentId` is set. */
export function resolve(snapshot: Snapshot, componentId: string | null): Resolved {
  if (componentId) {
    const component = snapshot.components.find(c => c.id === componentId)
    return {
      state: component ? toState(component.status) : 'unknown',
      name: component?.name ?? '',
      url: snapshot.page.url,
    }
  }
  return { state: toState(snapshot.status.indicator), name: snapshot.page.name, url: snapshot.page.url }
}
