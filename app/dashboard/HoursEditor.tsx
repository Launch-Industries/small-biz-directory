'use client'
import type { HoursSchedule, DayKey } from '@/lib/hours'

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
]

interface Props {
  value: HoursSchedule
  onChange: (v: HoursSchedule) => void
}

export function HoursEditor({ value, onChange }: Props) {
  function update(key: DayKey, patch: Partial<HoursSchedule[DayKey]>) {
    onChange({ ...value, [key]: { ...value[key], ...patch } })
  }

  return (
    <div className="space-y-2">
      {DAYS.map(({ key, label }) => {
        const day = value[key]
        return (
          <div key={key} className={`flex items-center gap-3 text-sm transition-opacity ${!day.open ? 'opacity-40' : ''}`}>
            <input
              type="checkbox"
              checked={day.open}
              onChange={e => update(key, { open: e.target.checked })}
              className="w-4 h-4 accent-li-teal shrink-0"
            />
            <span className="w-24 font-medium text-ink-700">{label}</span>
            {day.open ? (
              <>
                <input
                  type="time"
                  value={day.openTime}
                  onChange={e => update(key, { openTime: e.target.value })}
                  className="border border-ink-200 rounded-lg px-2 py-1 text-sm"
                />
                <span className="text-ink-400 text-xs">to</span>
                <input
                  type="time"
                  value={day.closeTime}
                  onChange={e => update(key, { closeTime: e.target.value })}
                  className="border border-ink-200 rounded-lg px-2 py-1 text-sm"
                />
              </>
            ) : (
              <span className="text-ink-400 italic text-sm">Closed</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
