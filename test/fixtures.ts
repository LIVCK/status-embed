import type { Snapshot } from '../src/snapshot'

export function snapshot(indicator = 'operational', overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    page: { id: 'p1', name: 'Acme Status', url: 'https://status.acme.example', locale: 'de', updated_at: '2026-10-26T12:00:00Z' },
    status: { indicator, description: '' },
    components: [
      { id: 'api', name: 'API', status: 'major_outage', is_group: false, group_id: null },
      { id: 'web', name: 'Website', status: 'under_maintenance', is_group: false, group_id: null },
    ],
    ...overrides,
  }
}
