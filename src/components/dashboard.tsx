'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getGlucoseReadingsRange, getDailyRecord, getInsulinRegimens } from '@/lib/api'
import { analyzeGlucoseTrend, type InsulinSuggestion } from '@/lib/insulin-advisor'
import { format, subDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { GlucoseTrendChart } from './glucose-trend-chart'

const TIMING_LABELS: Record<string, string> = {
  before_breakfast: '朝食前',
  after_breakfast: '朝食後',
  before_lunch: '昼食前',
  after_lunch: '昼食後',
  before_dinner: '夕食前',
  after_dinner: '夕食後',
  bedtime: '眠前',
}

export function Dashboard({ userId }: { userId: string }) {
  const [todayRecord, setTodayRecord] = useState<any>(null)
  const [todayGlucose, setTodayGlucose] = useState<any[]>([])
  const [weekGlucose, setWeekGlucose] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<InsulinSuggestion[]>([])

  const today = format(new Date(), 'yyyy-MM-dd')
  const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd')

  useEffect(() => {
    async function load() {
      const [record, glucose7d, regimens] = await Promise.all([
        getDailyRecord(userId, today),
        getGlucoseReadingsRange(userId, weekAgo, today),
        getInsulinRegimens(userId),
      ])
      setTodayRecord(record)
      setTodayGlucose(glucose7d.filter(r => r.date === today))
      setWeekGlucose(glucose7d)
      setSuggestions(analyzeGlucoseTrend(glucose7d, regimens))
    }
    load()
  }, [userId, today, weekAgo])

  const filledCount = todayGlucose.length
  const totalSlots = 7

  return (
    <div className="px-4 space-y-4">
      <h2 className="text-lg font-bold">
        {format(new Date(), 'M月d日（E）', { locale: ja })}
      </h2>

      {/* Today's summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">今日の入力状況</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm text-gray-600">血糖値</span>
            <Badge variant={filledCount === totalSlots ? 'default' : 'secondary'}>
              {filledCount} / {totalSlots}
            </Badge>
          </div>
          <div className="grid grid-cols-4 gap-1 text-xs">
            {Object.entries(TIMING_LABELS).map(([key, label]) => {
              const reading = todayGlucose.find(r => r.timing === key)
              return (
                <div
                  key={key}
                  className={`p-1.5 rounded text-center ${
                    reading
                      ? reading.value < 70
                        ? 'bg-yellow-100 text-yellow-800'
                        : reading.value > 180
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  <div className="font-medium">{label}</div>
                  <div className="text-sm font-bold">{reading ? reading.value : '-'}</div>
                </div>
              )
            })}
          </div>
          {todayRecord && (
            <div className="flex gap-4 mt-3 text-sm text-gray-600">
              {todayRecord.weight && <span>体重: {todayRecord.weight}kg</span>}
              {todayRecord.steps && <span>歩数: {todayRecord.steps.toLocaleString()}</span>}
              {todayRecord.bp_morning_sys && (
                <span>朝BP: {todayRecord.bp_morning_sys}/{todayRecord.bp_morning_dia}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly glucose trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">直近7日間の血糖トレンド</CardTitle>
        </CardHeader>
        <CardContent>
          {weekGlucose.length > 0 ? (
            <GlucoseTrendChart readings={weekGlucose} />
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">
              データがありません。記録を始めましょう。
            </p>
          )}
        </CardContent>
      </Card>

      {/* Insulin suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-orange-800">
              インスリン調整提案
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((s, i) => (
              <div key={i} className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={s.type === 'increase' ? 'destructive' : 'secondary'}>
                    {s.type === 'increase' ? '増量検討' : '減量検討'}
                  </Badge>
                  <span className="font-medium">{s.adjustment}</span>
                </div>
                <p className="text-gray-700 mt-1">{s.reason}</p>
                <p className="text-gray-600">{s.detail}</p>
              </div>
            ))}
            <p className="text-xs text-orange-600 mt-2 border-t border-orange-200 pt-2">
              ※ この提案は参考情報です。インスリン量の変更は必ず主治医にご相談ください。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
