'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'
import type { GlucoseTiming } from '@/types/database'

interface Reading {
  date: string
  timing: GlucoseTiming
  value: number
}

const TIMING_COLORS: Record<string, string> = {
  before_breakfast: '#3b82f6',
  after_breakfast: '#93c5fd',
  before_lunch: '#10b981',
  after_lunch: '#6ee7b7',
  before_dinner: '#f59e0b',
  after_dinner: '#fcd34d',
  bedtime: '#8b5cf6',
}

const TIMING_LABELS: Record<string, string> = {
  before_breakfast: '朝食前',
  after_breakfast: '朝食後',
  before_lunch: '昼食前',
  after_lunch: '昼食後',
  before_dinner: '夕食前',
  after_dinner: '夕食後',
  bedtime: '眠前',
}

export function GlucoseTrendChart({ readings }: { readings: Reading[] }) {
  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, number>>()
    for (const r of readings) {
      const entry = byDate.get(r.date) ?? {}
      entry[r.timing] = r.value
      byDate.set(r.date, entry)
    }
    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date: format(new Date(date), 'M/d'),
        ...values,
      }))
  }, [readings])

  const timings = useMemo(() => {
    const set = new Set(readings.map(r => r.timing))
    return Array.from(set)
  }, [readings])

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis domain={[40, 300]} tick={{ fontSize: 11 }} />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any) => [
              `${value} mg/dL`,
              TIMING_LABELS[name as string] ?? name,
            ]}
          />
          <ReferenceLine y={70} stroke="#facc15" strokeDasharray="3 3" label={{ value: '70', fontSize: 10 }} />
          <ReferenceLine y={180} stroke="#f87171" strokeDasharray="3 3" label={{ value: '180', fontSize: 10 }} />
          {timings.map((timing) => (
            <Line
              key={timing}
              type="monotone"
              dataKey={timing}
              stroke={TIMING_COLORS[timing] ?? '#888'}
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
