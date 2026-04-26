'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getGlucoseReadingsRange, getDailyRecordsRange } from '@/lib/api'
import { GlucoseTrendChart } from './glucose-trend-chart'
import { format, subDays } from 'date-fns'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const PERIODS = [
  { label: '7日', days: 7 },
  { label: '14日', days: 14 },
  { label: '30日', days: 30 },
]

const TIMING_LABELS: Record<string, string> = {
  before_breakfast: '朝食前',
  after_breakfast: '朝食後',
  before_lunch: '昼食前',
  after_lunch: '昼食後',
  before_dinner: '夕食前',
  after_dinner: '夕食後',
  bedtime: '眠前',
}

export function TrendView({ userId }: { userId: string }) {
  const [days, setDays] = useState(7)
  const [glucoseData, setGlucoseData] = useState<any[]>([])
  const [dailyData, setDailyData] = useState<any[]>([])

  useEffect(() => {
    const end = format(new Date(), 'yyyy-MM-dd')
    const start = format(subDays(new Date(), days), 'yyyy-MM-dd')

    Promise.all([
      getGlucoseReadingsRange(userId, start, end),
      getDailyRecordsRange(userId, start, end),
    ]).then(([glucose, daily]) => {
      setGlucoseData(glucose)
      setDailyData(daily)
    })
  }, [userId, days])

  // Stats
  const glucoseValues = glucoseData.map(r => r.value)
  const avg = glucoseValues.length > 0
    ? Math.round(glucoseValues.reduce((s, v) => s + v, 0) / glucoseValues.length)
    : null
  const sd = glucoseValues.length > 1
    ? Math.round(Math.sqrt(glucoseValues.reduce((s, v) => s + (v - avg!)** 2, 0) / glucoseValues.length))
    : null

  // By timing average
  const byTiming = new Map<string, number[]>()
  for (const r of glucoseData) {
    const list = byTiming.get(r.timing) ?? []
    list.push(r.value)
    byTiming.set(r.timing, list)
  }

  // Weight chart data
  const weightData = dailyData
    .filter(d => d.weight)
    .map(d => ({ date: format(new Date(d.date), 'M/d'), weight: d.weight }))

  // BP chart data
  const bpData = dailyData
    .filter(d => d.bp_morning_sys || d.bp_evening_sys)
    .map(d => ({
      date: format(new Date(d.date), 'M/d'),
      morSys: d.bp_morning_sys,
      morDia: d.bp_morning_dia,
      eveSys: d.bp_evening_sys,
      eveDia: d.bp_evening_dia,
    }))

  return (
    <div className="px-4 space-y-4">
      <div className="flex gap-2">
        {PERIODS.map(p => (
          <Button
            key={p.days}
            variant={days === p.days ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDays(p.days)}
          >
            {p.label}
          </Button>
        ))}
      </div>

      {/* Glucose Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">血糖トレンド</CardTitle>
        </CardHeader>
        <CardContent>
          {glucoseData.length > 0 ? (
            <GlucoseTrendChart readings={glucoseData} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">データなし</p>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {avg !== null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">統計サマリー</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-blue-50 p-2 rounded text-center">
                <div className="text-gray-500">全体平均</div>
                <div className="text-xl font-bold text-blue-700">{avg} <span className="text-xs">mg/dL</span></div>
              </div>
              <div className="bg-blue-50 p-2 rounded text-center">
                <div className="text-gray-500">標準偏差</div>
                <div className="text-xl font-bold text-blue-700">{sd} <span className="text-xs">mg/dL</span></div>
              </div>
            </div>
            <div className="mt-3 space-y-1">
              {Array.from(byTiming.entries()).map(([timing, values]) => {
                const timingAvg = Math.round(values.reduce((s, v) => s + v, 0) / values.length)
                return (
                  <div key={timing} className="flex justify-between text-sm">
                    <span className="text-gray-600">{TIMING_LABELS[timing] ?? timing}</span>
                    <span className="font-medium">{timingAvg} mg/dL ({values.length}回)</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weight Trend */}
      {weightData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">体重推移</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="体重 (kg)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BP Trend */}
      {bpData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">血圧推移</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bpData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis domain={[50, 180]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="morSys" stroke="#ef4444" strokeWidth={2} name="朝 収縮期" />
                  <Line type="monotone" dataKey="morDia" stroke="#f87171" strokeWidth={1} name="朝 拡張期" />
                  <Line type="monotone" dataKey="eveSys" stroke="#3b82f6" strokeWidth={2} name="夜 収縮期" />
                  <Line type="monotone" dataKey="eveDia" stroke="#93c5fd" strokeWidth={1} name="夜 拡張期" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
