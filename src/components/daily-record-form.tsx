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

  return (
    <div className="px-2 pb-20">
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-3">
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w - 1)}>←</Button>
        <div className="text-center text-sm font-bold">
          {format(weekStart, 'M/d', { locale: ja })} 〜 {format(weekEnd, 'M/d', { locale: ja })}
        </div>
        <Button variant="outline" size="sm" onClick={() => setWeekOffset(w => w + 1)}>→</Button>
      </div>

      {/* Day cards */}
      <div className="space-y-2">
        {days.map((day, i) => {
          const prev = i > 0 ? days[i - 1] : null
          const d = new Date(day.date)
          const isToday = day.date === format(today, 'yyyy-MM-dd')
          const dow = format(d, 'E', { locale: ja })
          const isSun = d.getDay() === 0
          const isSat = d.getDay() === 6
          const hasData = day.weight || day.temperature || day.bpMorningSys ||
            GLUCOSE_TIMINGS.some(t => day.glucose[t.key])

          return (
            <div
              key={day.date}
              className={`rounded-lg border shadow-sm overflow-hidden ${
                isToday ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 bg-white'
              }`}
            >
              {/* Date header */}
              <div className={`flex items-center justify-between px-3 py-1.5 ${
                isToday ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
              }`}>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold">{format(d, 'M/d')}</span>
                  <span className={`text-xs font-medium ${
                    isToday ? 'text-blue-100' :
                    isSun ? 'text-red-500' : isSat ? 'text-blue-500' : 'text-gray-400'
                  }`}>({dow})</span>
                  {isToday && <span className="text-[10px] bg-white/20 rounded px-1.5 py-0.5">今日</span>}
                </div>
                {day.dirty && <span className="text-[10px] opacity-70">未保存</span>}
              </div>

              {/* Body */}
              <div className="px-2 py-1.5 space-y-1">
                {/* Row 1: 体重・体温・歩数 */}
                <div className="grid grid-cols-4 gap-1">
                  <FieldCell label="体重">
                    <DrumPicker value={day.weight} onChange={v => updateDay(i, 'weight', v)} min={30} max={150} step={0.1} decimals={1} unit="kg" label="体重" defaultValue={prev?.weight} />
                  </FieldCell>
                  <FieldCell label="体温">
                    <DrumPicker value={day.temperature} onChange={v => updateDay(i, 'temperature', v)} min={34.0} max={42.0} step={0.1} decimals={1} unit="℃" label="体温" defaultValue={prev?.temperature} />
                  </FieldCell>
                  <FieldCell label="歩数">
                    <DrumPicker value={day.steps} onChange={v => updateDay(i, 'steps', v)} min={0} max={50000} step={500} decimals={0} unit="歩" label="歩数" defaultValue={prev?.steps} />
                  </FieldCell>
                  <FieldCell label="便">
                    <DrumPicker value={day.bowelCount} onChange={v => updateDay(i, 'bowelCount', v)} min={0} max={10} step={1} decimals={0} label="排便回数" />
                  </FieldCell>
                </div>

                {/* Row 2: 血圧 */}
                <div className="grid grid-cols-2 gap-1">
                  <div className="bg-gray-50 rounded px-1.5 py-1">
                    <div className="text-[10px] text-gray-400 mb-0.5">朝血圧</div>
                    <div className="flex items-center gap-0.5">
                      <DrumPicker value={day.bpMorningSys} onChange={v => updateDay(i, 'bpMorningSys', v)} min={60} max={250} step={1} decimals={0} label="朝 収縮期" defaultValue={prev?.bpMorningSys} />
                      <span className="text-gray-300 text-xs">/</span>
                      <DrumPicker value={day.bpMorningDia} onChange={v => updateDay(i, 'bpMorningDia', v)} min={30} max={150} step={1} decimals={0} label="朝 拡張期" defaultValue={prev?.bpMorningDia} />
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded px-1.5 py-1">
                    <div className="text-[10px] text-gray-400 mb-0.5">夜血圧</div>
                    <div className="flex items-center gap-0.5">
                      <DrumPicker value={day.bpEveningSys} onChange={v => updateDay(i, 'bpEveningSys', v)} min={60} max={250} step={1} decimals={0} label="夜 収縮期" defaultValue={prev?.bpEveningSys} />
                      <span className="text-gray-300 text-xs">/</span>
                      <DrumPicker value={day.bpEveningDia} onChange={v => updateDay(i, 'bpEveningDia', v)} min={30} max={150} step={1} decimals={0} label="夜 拡張期" defaultValue={prev?.bpEveningDia} />
                    </div>
                  </div>
                </div>

                {/* Row 3: 血糖 7 points */}
                <div>
                  <div className="text-[10px] text-gray-400 px-0.5 mb-0.5">血糖値</div>
                  <div className="grid grid-cols-7 gap-0.5">
                    {GLUCOSE_TIMINGS.map(t => (
                      <div key={t.key} className={`rounded text-center ${glucoseColor(day.glucose[t.key])}`}>
                        <div className="text-[9px] text-gray-400 leading-tight">{t.short}</div>
                        <DrumPicker value={day.glucose[t.key]} onChange={v => updateDay(i, `glucose.${t.key}`, v)} min={30} max={500} step={1} decimals={0} unit="" label={t.short} defaultValue={prev?.glucose[t.key]} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Row 4: 食事・性状・酒・メモ */}
                <div className="grid grid-cols-[1fr_auto_auto_1fr] gap-1 items-center">
                  <div>
                    <div className="text-[10px] text-gray-400">食事</div>
                    <input
                      value={[day.meals.breakfast, day.meals.lunch, day.meals.dinner].filter(Boolean).join('/')}
                      onChange={e => {
                        const parts = e.target.value.split('/')
                        updateDay(i, 'meals.breakfast', parts[0] ?? '')
                        updateDay(i, 'meals.lunch', parts[1] ?? '')
                        updateDay(i, 'meals.dinner', parts[2] ?? '')
                      }}
                      className="w-full bg-gray-50 text-xs outline-none focus:bg-blue-50 rounded h-7 px-1.5"
                      placeholder="朝/昼/夕"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">性状</div>
                    <select
                      value={day.bowelScale}
                      onChange={e => updateDay(i, 'bowelScale', e.target.value)}
                      className="bg-gray-50 text-[10px] outline-none focus:bg-blue-50 rounded h-7 px-0.5"
                    >
                      {BOWEL_SCALE_LABELS.map((label, idx) => (
                        <option key={idx} value={idx === 0 ? '' : idx}>{label || '-'}</option>
                      ))}
                    </select>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-gray-400">酒</div>
                    <input
                      type="checkbox"
                      checked={day.alcohol === '有'}
                      onChange={e => updateDay(i, 'alcohol', e.target.checked ? '有' : '')}
                      className="w-5 h-5 accent-blue-600 mt-0.5"
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">メモ</div>
                    <input
                      value={day.memo}
                      onChange={e => updateDay(i, 'memo', e.target.value)}
                      className="w-full bg-gray-50 text-xs outline-none focus:bg-blue-50 rounded h-7 px-1.5"
                      placeholder="-"
                    />
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

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

function FieldCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded px-1 py-0.5 text-center">
      <div className="text-[10px] text-gray-400 leading-tight">{label}</div>
      {children}
    </div>
  )
}
