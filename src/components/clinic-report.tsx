'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  getClinicVisits,
  addClinicVisit,
  deleteClinicVisit,
  getGlucoseReadingsRange,
  getDailyRecordsRange,
} from '@/lib/api'
import { GlucoseTrendChart } from './glucose-trend-chart'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const TIMING_LABELS: Record<string, string> = {
  before_breakfast: '朝食前',
  after_breakfast: '朝食後',
  before_lunch: '昼食前',
  after_lunch: '昼食後',
  before_dinner: '夕食前',
  after_dinner: '夕食後',
  bedtime: '眠前',
}

export function ClinicReport({ userId }: { userId: string }) {
  const [visits, setVisits] = useState<any[]>([])
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [showAddVisit, setShowAddVisit] = useState(false)

  // Report state
  const [reportRange, setReportRange] = useState<{ start: string; end: string } | null>(null)
  const [glucoseData, setGlucoseData] = useState<any[]>([])
  const [dailyData, setDailyData] = useState<any[]>([])

  const loadVisits = async () => {
    const data = await getClinicVisits(userId)
    setVisits(data)
  }

  useEffect(() => { loadVisits() }, [userId])

  const handleAddVisit = async () => {
    await addClinicVisit(userId, newDate)
    setShowAddVisit(false)
    loadVisits()
  }

  const handleDeleteVisit = async (id: string) => {
    await deleteClinicVisit(id)
    loadVisits()
  }

  const generateReport = async (prevDate: string, currentDate: string) => {
    setReportRange({ start: prevDate, end: currentDate })
    const [glucose, daily] = await Promise.all([
      getGlucoseReadingsRange(userId, prevDate, currentDate),
      getDailyRecordsRange(userId, prevDate, currentDate),
    ])
    setGlucoseData(glucose)
    setDailyData(daily)
  }

  // Stats
  const glucoseValues = glucoseData.map(r => r.value)
  const glucoseAvg = glucoseValues.length > 0
    ? Math.round(glucoseValues.reduce((s, v) => s + v, 0) / glucoseValues.length)
    : null

  const byTiming = new Map<string, number[]>()
  for (const r of glucoseData) {
    const list = byTiming.get(r.timing) ?? []
    list.push(r.value)
    byTiming.set(r.timing, list)
  }

  const bpMorningValues = dailyData.filter(d => d.bp_morning_sys)
  const bpEveningValues = dailyData.filter(d => d.bp_evening_sys)
  const bpMorningAvg = bpMorningValues.length > 0
    ? {
        sys: Math.round(bpMorningValues.reduce((s, d) => s + d.bp_morning_sys, 0) / bpMorningValues.length),
        dia: Math.round(bpMorningValues.reduce((s, d) => s + d.bp_morning_dia, 0) / bpMorningValues.length),
      }
    : null
  const bpEveningAvg = bpEveningValues.length > 0
    ? {
        sys: Math.round(bpEveningValues.reduce((s, d) => s + d.bp_evening_sys, 0) / bpEveningValues.length),
        dia: Math.round(bpEveningValues.reduce((s, d) => s + d.bp_evening_dia, 0) / bpEveningValues.length),
      }
    : null

  const weightData = dailyData
    .filter(d => d.weight)
    .map(d => ({ date: format(new Date(d.date), 'M/d'), weight: d.weight }))

  return (
    <div className="px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">受診レポート</h2>
        <Button size="sm" onClick={() => setShowAddVisit(!showAddVisit)}>
          {showAddVisit ? 'キャンセル' : '+ 受診日追加'}
        </Button>
      </div>

      {showAddVisit && (
        <Card>
          <CardContent className="pt-4 flex items-center gap-2">
            <Input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddVisit}>登録</Button>
          </CardContent>
        </Card>
      )}

      {/* Visit list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">受診日一覧</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {visits.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">受診日が登録されていません</p>
          ) : (
            visits.map((v, i) => {
              const prevVisit = visits[i + 1]
              return (
                <div key={v.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <span className="font-medium">
                      {format(new Date(v.visit_date), 'yyyy年M月d日（E）', { locale: ja })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {prevVisit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateReport(prevVisit.visit_date, v.visit_date)}
                      >
                        レポート
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => handleDeleteVisit(v.id)}
                    >
                      削除
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Report */}
      {reportRange && (
        <>
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-blue-800">
                期間レポート: {format(new Date(reportRange.start), 'M/d')} 〜 {format(new Date(reportRange.end), 'M/d')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* BP Average */}
              <div>
                <h3 className="text-sm font-semibold mb-2">血圧平均</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white p-2 rounded text-center">
                    <div className="text-gray-500">朝</div>
                    <div className="text-lg font-bold">
                      {bpMorningAvg ? `${bpMorningAvg.sys}/${bpMorningAvg.dia}` : '-'}
                    </div>
                    <div className="text-xs text-gray-400">mmHg ({bpMorningValues.length}回)</div>
                  </div>
                  <div className="bg-white p-2 rounded text-center">
                    <div className="text-gray-500">夜</div>
                    <div className="text-lg font-bold">
                      {bpEveningAvg ? `${bpEveningAvg.sys}/${bpEveningAvg.dia}` : '-'}
                    </div>
                    <div className="text-xs text-gray-400">mmHg ({bpEveningValues.length}回)</div>
                  </div>
                </div>
              </div>

              {/* Glucose Average */}
              <div>
                <h3 className="text-sm font-semibold mb-2">血糖平均</h3>
                {glucoseAvg !== null ? (
                  <>
                    <div className="bg-white p-2 rounded text-center mb-2">
                      <div className="text-2xl font-bold text-blue-700">{glucoseAvg} <span className="text-sm">mg/dL</span></div>
                      <div className="text-xs text-gray-400">{glucoseValues.length}回計測</div>
                    </div>
                    <div className="space-y-1">
                      {Array.from(byTiming.entries()).map(([timing, values]) => {
                        const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length)
                        return (
                          <div key={timing} className="flex justify-between text-sm bg-white px-2 py-1 rounded">
                            <span className="text-gray-600">{TIMING_LABELS[timing]}</span>
                            <span className="font-medium">{avg} mg/dL</span>
                          </div>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400">データなし</p>
                )}
              </div>

              {/* Weight Chart */}
              {weightData.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">体重推移</h3>
                  <div className="bg-white rounded p-2">
                    <div className="w-full h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={weightData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                          <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2} name="体重 (kg)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* Glucose Trend */}
              {glucoseData.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">血糖トレンド</h3>
                  <div className="bg-white rounded p-2">
                    <GlucoseTrendChart readings={glucoseData} />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
