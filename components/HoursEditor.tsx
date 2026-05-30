'use client'
import { useState } from 'react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
type Day = typeof DAYS[number]

interface DayHours {
  closed: boolean
  open: string
  close: string
}

type WeekHours = Record<Day, DayHours>

const DEFAULT_HOURS: WeekHours = {
  Monday:    { closed: false, open: '09:00', close: '17:00' },
  Tuesday:   { closed: false, open: '09:00', close: '17:00' },
  Wednesday: { closed: false, open: '09:00', close: '17:00' },
  Thursday:  { closed: false, open: '09:00', close: '17:00' },
  Friday:    { closed: false, open: '09:00', close: '17:00' },
  Saturday:  { closed: true,  open: '10:00', close: '15:00' },
  Sunday:    { closed: true,  open: '10:00', close: '15:00' },
}

function parse(raw: string | null | undefined): WeekHours {
  if (!raw) return { ...DEFAULT_HOURS }
  try {
    const parsed = JSON.parse(raw)
    // merge with defaults so any missing days are filled
    const result = { ...DEFAULT_HOURS }
    for (const day of DAYS) {
      if (parsed[day]) result[day] = { ...DEFAULT_HOURS[day], ...parsed[day] }
    }
    return result
  } catch {
    return { ...DEFAULT_HOURS }
  }
}

function fmt(t: string) {
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'pm' : 'am'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

interface Props {
  value?: string | null
  onChange: (json: string) => void
}

export default function HoursEditor({ value, onChange }: Props) {
  const [hours, setHours] = useState<WeekHours>(() => parse(value))

  function update(day: Day, patch: Partial<DayHours>) {
    const next = { ...hours, [day]: { ...hours[day], ...patch } }
    setHours(next)
    onChange(JSON.stringify(next))
  }

  const inputCls = 'border border-ink-200 rounded px-2 py-1 text-xs text-ink-700 bg-white w-24 focus:outline-none focus:border-ink-500'

  return (
    <div className="space-y-1">
      {DAYS.map(day => {
        const d = hours[day]
        return (
          <div key={day} className="flex items-center gap-3 py-1">
            <span className="text-xs font-semibold text-ink-700 w-24 shrink-0">{day.slice(0, 3)}</span>
            <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={d.closed}
                onChange={e => update(day, { closed: e.target.checked })}
                className="rounded border-ink-300 text-ink-900 focus:ring-ink-500"
              />
              <span className="text-xs text-ink-500">Closed</span>
            </label>
            {!d.closed && (
              <>
                <input
                  type="time"
                  value={d.open}
                  onChange={e => update(day, { open: e.target.value })}
                  className={inputCls}
                />
                <span className="text-xs text-ink-400">–</span>
                <input
                  type="time"
                  value={d.close}
                  onChange={e => update(day, { close: e.target.value })}
                  className={inputCls}
                />
                <span className="text-xs text-ink-400 hidden sm:inline">
                  {fmt(d.open)} – {fmt(d.close)}
                </span>
              </>
            )}
            {d.closed && (
              <span className="text-xs text-ink-400 italic">Closed</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
