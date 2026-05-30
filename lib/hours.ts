export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
export type DayHours = { open: boolean; openTime: string; closeTime: string }
export type HoursSchedule = Record<DayKey, DayHours>

export const DEFAULT_HOURS: HoursSchedule = {
  mon: { open: true,  openTime: '09:00', closeTime: '17:00' },
  tue: { open: true,  openTime: '09:00', closeTime: '17:00' },
  wed: { open: true,  openTime: '09:00', closeTime: '17:00' },
  thu: { open: true,  openTime: '09:00', closeTime: '17:00' },
  fri: { open: true,  openTime: '09:00', closeTime: '17:00' },
  sat: { open: false, openTime: '10:00', closeTime: '15:00' },
  sun: { open: false, openTime: '10:00', closeTime: '15:00' },
}

export function parseHours(raw: string | null): HoursSchedule {
  if (!raw) return DEFAULT_HOURS
  try {
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_HOURS, ...parsed }
  } catch {
    return DEFAULT_HOURS
  }
}

export function serializeHours(schedule: HoursSchedule): string {
  return JSON.stringify(schedule)
}
