'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { DrumPicker } from '@/components/drum-picker'
import {
  getDailyRecordsRange,
  getGlucoseReadingsRange,
  getMeals,
  upsertDailyRecord,
  upsertGlucoseReading,
  upsertMeal,
} from '@/lib/api'
import type { GlucoseTiming, MealType } from '@/types/database'
import { format, addDays, startOfWeek, endOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'

const GLUCOSE_TIMINGS: { key: GlucoseTiming; short: string }[] = [
  { key: 'before_breakfast', short: '朝前' },
  { key: 'after_breakfast', short: '朝後' },
  { key: 'before_lunch', short: '昼前' },
  { key: 'after_lunch', short: '昼後' },
  { key: 'before_dinner', short: '夕前' },
  { key: 'after_dinner', short: '夕後' },
  { key: 'bedtime', short: '眠前' },
]

const BOWEL_SCALE_LABELS = ['', '1:硬', '2:やや硬', '3:普通', '4:やや軟', '5:軟', '6:泥状', '7:水様']

interface DayData {
  date: string
  weight: string
  temperature: string
  bpMorningSys: string
  bpMorningDia: string
  bpEveningSys: string
  bpEveningDia: string
  glucose: Record<GlucoseTiming, string>
  meals: { breakfast: string; lunch: string; dinner: string; snack: string }
  steps: string
  exercise: string
  bowelCount: string
  bowelScale: string
  alcohol: string
  memo: string
  dirty: boolean
}

function emptyDay(date: string): DayData {
  return {
    date,
    weight: '', temperature: '',
    bpMorningSys: '', bpMorningDia: '',
    bpEveningSys: '', bpEveningDia: '',
    glucose: Object.fromEntries(GLUCOSE_TIMINGS.map(t => [t.key, ''])) as Record<GlucoseTiming, string>,
    meals: { breakfast: '', lunch: '', dinner: '', snack: '' },
    steps: '', exercise: '',
    bowelCount: '', bowelScale: '',
    alcohol: '',
    memo: '',
    dirty: false,
  }
}

export function DailyRecordForm({ userId }: { userId: string }) {
  const [weekOffset, setWeekOffset] = useState(0)
  const [days, setDays] = useState<DayData[]>([])
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')

  const today = new Date()
  const weekStart = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 })
  const weekEnd = endOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 })
  const startStr = format(weekStart, 'yyyy-MM-dd')
  const endStr = format(weekEnd, 'yyyy-MM-dd')

  const loadWeek = useCallback(async () => {
    const dates: string[] = []
    for (let i = 0; i < 7; i++) {
      dates.push(format(addDays(weekStart, i), 'yyyy-MM-dd'))
    }

    const [records, glucoseAll] = await Promise.all([
      getDailyRecordsRange(userId, startStr, endStr),
      getGlucoseReadingsRange(userId, startStr, endStr),
    ])

    const mealsMap = new Map<string, Record<string, string>>()
    for (const d of dates) {
      const mealData = await getMeals(userId, d)
      const m: Record<string, string> = { breakfast: '', lunch: '', dinner: '', snack: '' }
      for (const meal of mealData) m[meal.meal_type] = meal.content
      mealsMap.set(d, m)
    }

    const newDays = dates.map(date => {
      const rec = records.find((r: any) => r.date === date)
      const glucoseForDay = glucoseAll.filter((g: any) => g.date === date)
      const mealForDay = mealsMap.get(date) ?? { breakfast: '', lunch: '', dinner: '', snack: '' }

      const day = emptyDay(date)
      if (rec) {
        day.weight = rec.weight?.toString() ?? ''
        day.temperature = rec.temperature?.toString() ?? ''
        day.bpMorningSys = rec.bp_morning_sys?.toString() ?? ''
        day.bpMorningDia = rec.bp_morning_dia?.toString() ?? ''
        day.bpEveningSys = rec.bp_evening_sys?.toString() ?? ''
        day.bpEveningDia = rec.bp_evening_dia?.toString() ?? ''
        day.steps = rec.steps?.toString() ?? ''
        day.exercise = rec.exercise ?? ''
        day.bowelCount = rec.bowel_count?.toString() ?? ''
        day.bowelScale = rec.bowel_scale?.toString() ?? ''
        day.alcohol = rec.alcohol ?? ''
        day.memo = rec.event_memo ?? ''
      }
      for (const g of glucoseForDay) {
        day.glucose[g.timing as GlucoseTiming] = g.value.toString()
      }
      day.meals = mealForDay as any
      return day
    })

    setDays(newDays)
  }, [userId, startStr, endStr]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadWeek() }, [loadWeek])

  const updateDay = (index: number, field: string, value: string) => {
    setDays(prev => {
      const next = [...prev]
      const day = { ...next[index], dirty: true }
      if (field.startsWith('glucose.')) {
        const key = field.replace('glucose.', '') as GlucoseTiming
        day.glucose = { ...day.glucose, [key]: value }
      } else if (field.startsWith('meals.')) {
        const key = field.replace('meals.', '')
        day.meals = { ...day.meals, [key]: value }
      } else {
        ;(day as any)[field] = value
      }
      next[index] = day
      return next
    })
  }

  const handleSaveAll = async () => {
    setSaving(true)
    setSavedMsg('')

    for (const day of days) {
      if (!day.dirty) continue
      const num = (v: string) => v ? Number(v) : null

      await upsertDailyRecord(userId, day.date, {
        weight: num(day.weight),
        temperature: num(day.temperature),
        steps: num(day.steps),
        exercise: day.exercise || null,
        bowel_count: num(day.bowelCount),
        bowel_scale: num(day.bowelScale),
        alcohol: day.alcohol || null,
        event_memo: day.memo || null,
        bp_morning_sys: num(day.bpMorningSys),
        bp_morning_dia: num(day.bpMorningDia),
        bp_morning_pulse: null,
        bp_evening_sys: num(day.bpEveningSys),
        bp_evening_dia: num(day.bpEveningDia),
        bp_evening_pulse: null,
      })

      for (const t of GLUCOSE_TIMINGS) {
        if (day.glucose[t.key]) {
          await upsertGlucoseReading(userId, day.date, t.key, Number(day.glucose[t.key]))
        }
      }

      for (const key of ['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]) {
        await upsertMeal(userId, day.date, key, day.meals[key])
      }
    }

    setSaving(false)
    setSavedMsg('保存しました')
    setTimeout(() => setSavedMsg(''), 2000)
    loadWeek()
  }

  const glucoseColor = (val: string) => {
    if (!val) return ''
    const n = Number(val)
    if (n < 70) return 'bg-yellow-100'
    if (n > 180) return 'bg-red-100'
    if (n >= 70 && n <= 130) return 'bg-green-50'
    return ''
  }

  const c = 'border border-gray-200 px-0.5 py-0.5'
  const hdr = `${c} bg-gray-100 text-[10px] text-gray-600 font-medium text-center whitespace-nowrap w-10`

  // Previous day helper for defaultValue
  const prevVal = (dayIdx: number, field: string) => {
    if (dayIdx === 0) return undefined
    const p = days[dayIdx - 1]
    if (field.startsWith('glucose.')) {
      const key = field.replace('glucose.', '') as GlucoseTiming
      return p.glucose[key] || undefined
    }
    return (p as any)[field] || undefined
  }

  return (
    <div className="px-1 pb-20">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-2">
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>←</Button>
        <div className="text-center text-sm font-bold">
          {format(weekStart, 'M/d', { locale: ja })} 〜 {format(weekEnd, 'M/d', { locale: ja })}
        </div>
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>→</Button>
      </div>

      {/* Transposed table: rows=fields, cols=days */}
      <table className="border-collapse w-full text-[11px]">
        {/* Header row: dates */}
        <thead>
          <tr>
            <th className={`${c} bg-gray-200 text-[10px] w-10`}></th>
            {days.map((day) => {
              const d = new Date(day.date)
              const isToday = day.date === format(today, 'yyyy-MM-dd')
              const dow = format(d, 'E', { locale: ja })
              const isSun = d.getDay() === 0
              const isSat = d.getDay() === 6
              return (
                <th
                  key={day.date}
                  className={`${c} text-center text-[10px] leading-tight ${
                    isToday ? 'bg-blue-500 text-white' : 'bg-gray-200'
                  }`}
                >
                  <div>{format(d, 'M/d')}</div>
                  <div className={
                    isToday ? 'text-blue-100' :
                    isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-400'
                  }>{dow}</div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {/* 体重 */}
          <tr>
            <td className={hdr}>体重</td>
            {days.map((day, i) => (
              <td key={day.date} className={c}>
                <DrumPicker value={day.weight} onChange={v => updateDay(i, 'weight', v)} min={30} max={150} step={0.1} decimals={1} unit="kg" label="体重" defaultValue={prevVal(i, 'weight')} />
              </td>
            ))}
          </tr>
          {/* 体温 */}
          <tr>
            <td className={hdr}>体温</td>
            {days.map((day, i) => (
              <td key={day.date} className={c}>
                <DrumPicker value={day.temperature} onChange={v => updateDay(i, 'temperature', v)} min={34} max={42} step={0.1} decimals={1} unit="℃" label="体温" defaultValue={prevVal(i, 'temperature')} />
              </td>
            ))}
          </tr>
          {/* 朝血圧 */}
          <tr>
            <td className={hdr}>朝血圧</td>
            {days.map((day, i) => (
              <td key={day.date} className={`${c} text-center`}>
                <div className="flex items-center justify-center gap-0">
                  <DrumPicker value={day.bpMorningSys} onChange={v => updateDay(i, 'bpMorningSys', v)} min={60} max={250} step={1} decimals={0} label="朝 収縮期" defaultValue={prevVal(i, 'bpMorningSys')} />
                  <span className="text-gray-300 text-[9px]">/</span>
                  <DrumPicker value={day.bpMorningDia} onChange={v => updateDay(i, 'bpMorningDia', v)} min={30} max={150} step={1} decimals={0} label="朝 拡張期" defaultValue={prevVal(i, 'bpMorningDia')} />
                </div>
              </td>
            ))}
          </tr>
          {/* 夜血圧 */}
          <tr>
            <td className={hdr}>夜血圧</td>
            {days.map((day, i) => (
              <td key={day.date} className={`${c} text-center`}>
                <div className="flex items-center justify-center gap-0">
                  <DrumPicker value={day.bpEveningSys} onChange={v => updateDay(i, 'bpEveningSys', v)} min={60} max={250} step={1} decimals={0} label="夜 収縮期" defaultValue={prevVal(i, 'bpEveningSys')} />
                  <span className="text-gray-300 text-[9px]">/</span>
                  <DrumPicker value={day.bpEveningDia} onChange={v => updateDay(i, 'bpEveningDia', v)} min={30} max={150} step={1} decimals={0} label="夜 拡張期" defaultValue={prevVal(i, 'bpEveningDia')} />
                </div>
              </td>
            ))}
          </tr>
          {/* 血糖 7 rows */}
          {GLUCOSE_TIMINGS.map(t => (
            <tr key={t.key}>
              <td className={hdr}>{t.short}</td>
              {days.map((day, i) => (
                <td key={day.date} className={`${c} ${glucoseColor(day.glucose[t.key])}`}>
                  <DrumPicker value={day.glucose[t.key]} onChange={v => updateDay(i, `glucose.${t.key}`, v)} min={30} max={500} step={1} decimals={0} label={t.short} defaultValue={prevVal(i, `glucose.${t.key}`)} />
                </td>
              ))}
            </tr>
          ))}
          {/* 食事 */}
          <tr>
            <td className={hdr}>食事</td>
            {days.map((day, i) => (
              <td key={day.date} className={c}>
                <input
                  value={[day.meals.breakfast, day.meals.lunch, day.meals.dinner].filter(Boolean).join('/')}
                  onChange={e => {
                    const parts = e.target.value.split('/')
                    updateDay(i, 'meals.breakfast', parts[0] ?? '')
                    updateDay(i, 'meals.lunch', parts[1] ?? '')
                    updateDay(i, 'meals.dinner', parts[2] ?? '')
                  }}
                  className="w-full bg-transparent text-[10px] outline-none focus:bg-blue-50 rounded h-7 px-0.5"
                  placeholder="朝/昼/夕"
                />
              </td>
            ))}
          </tr>
          {/* 歩数 */}
          <tr>
            <td className={hdr}>歩数</td>
            {days.map((day, i) => (
              <td key={day.date} className={c}>
                <DrumPicker value={day.steps} onChange={v => updateDay(i, 'steps', v)} min={0} max={50000} step={500} decimals={0} unit="歩" label="歩数" defaultValue={prevVal(i, 'steps')} />
              </td>
            ))}
          </tr>
          {/* 便 */}
          <tr>
            <td className={hdr}>便</td>
            {days.map((day, i) => (
              <td key={day.date} className={c}>
                <DrumPicker value={day.bowelCount} onChange={v => updateDay(i, 'bowelCount', v)} min={0} max={10} step={1} decimals={0} label="排便回数" />
              </td>
            ))}
          </tr>
          {/* 便性状 */}
          <tr>
            <td className={hdr}>性状</td>
            {days.map((day, i) => (
              <td key={day.date} className={c}>
                <select
                  value={day.bowelScale}
                  onChange={e => updateDay(i, 'bowelScale', e.target.value)}
                  className="w-full bg-transparent text-[9px] outline-none focus:bg-blue-50 rounded h-7"
                >
                  {BOWEL_SCALE_LABELS.map((label, idx) => (
                    <option key={idx} value={idx === 0 ? '' : idx}>{label || '-'}</option>
                  ))}
                </select>
              </td>
            ))}
          </tr>
          {/* 酒 */}
          <tr>
            <td className={hdr}>酒</td>
            {days.map((day, i) => (
              <td key={day.date} className={`${c} text-center`}>
                <input
                  type="checkbox"
                  checked={day.alcohol === '有'}
                  onChange={e => updateDay(i, 'alcohol', e.target.checked ? '有' : '')}
                  className="w-4 h-4 accent-blue-600"
                />
              </td>
            ))}
          </tr>
          {/* メモ */}
          <tr>
            <td className={hdr}>メモ</td>
            {days.map((day, i) => (
              <td key={day.date} className={c}>
                <input
                  value={day.memo}
                  onChange={e => updateDay(i, 'memo', e.target.value)}
                  className="w-full bg-transparent text-[10px] outline-none focus:bg-blue-50 rounded h-7 px-0.5"
                  placeholder="-"
                />
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex gap-3 text-[10px] text-gray-500 mt-2 justify-center">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-50 border rounded"></span>70-130</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-100 border rounded"></span>&lt;70</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-100 border rounded"></span>&gt;180</span>
      </div>

      {/* Save */}
      <div className="sticky bottom-16 bg-gray-50/90 backdrop-blur py-2 mt-2">
        <Button onClick={handleSaveAll} disabled={saving} className="w-full" size="lg">
          {saving ? '保存中...' : savedMsg || '保存する'}
        </Button>
      </div>
    </div>
  )
}
