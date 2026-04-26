'use client'

import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import {
  INSULIN_PRODUCTS,
  PRODUCT_CATEGORIES,
  FREQUENCY_LABELS,
  TIMING_OPTIONS_BY_FREQUENCY,
  type ProductCategory,
  type InsulinProduct,
} from '@/data/insulin-products'
import { format, addDays, differenceInDays } from 'date-fns'
import { ja } from 'date-fns/locale'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  PRODUCT_CATEGORIES.map(c => [c.value, c.label])
)

const TIMING_LABELS: Record<string, string> = {
  before_breakfast: '朝食前',
  before_lunch: '昼食前',
  before_dinner: '夕食前',
  bedtime: '眠前',
  weekly: '週1回',
}

export function InsulinSettings({ userId }: { userId: string }) {
  const [regimens, setRegimens] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>('rapid')
  const [selectedProduct, setSelectedProduct] = useState<InsulinProduct | null>(null)
  const [timing, setTiming] = useState('before_breakfast')
  const [dose, setDose] = useState('')
  const [weeklyDay, setWeeklyDay] = useState(1) // 月曜
  const [lastInjectionDate, setLastInjectionDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const filteredProducts = useMemo(() =>
    INSULIN_PRODUCTS.filter(p => p.category === selectedCategory),
    [selectedCategory]
  )

  const timingOptions = useMemo(() => {
    if (!selectedProduct) return []
    return TIMING_OPTIONS_BY_FREQUENCY[selectedProduct.frequency] ?? []
  }, [selectedProduct])

  // Reset when category changes
  useEffect(() => {
    setSelectedProduct(null)
    setDose('')
  }, [selectedCategory])

  // Reset timing when product changes
  useEffect(() => {
    if (selectedProduct) {
      const opts = TIMING_OPTIONS_BY_FREQUENCY[selectedProduct.frequency] ?? []
      if (opts.length > 0) setTiming(opts[0].value)
      if (selectedProduct.doseOptions?.length) setDose(selectedProduct.doseOptions[0].toString())
      else setDose('')
    }
  }, [selectedProduct])

  const load = async () => {
    const { data } = await supabase
      .from('insulin_regimens')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at')
    setRegimens(data ?? [])
  }

  useEffect(() => { load() }, [userId])

  const handleAdd = async () => {
    if (!selectedProduct || !dose) return

    const isWeekly = selectedProduct.frequency === 'once_weekly'

    await supabase.from('insulin_regimens').insert({
      user_id: userId,
      insulin_name: selectedProduct.name,
      generic_name: selectedProduct.genericName,
      insulin_type: selectedProduct.category,
      category: selectedProduct.category,
      frequency: selectedProduct.frequency,
      timing: isWeekly ? 'weekly' : timing,
      dose_units: Number(dose),
      dose_unit: selectedProduct.doseUnit,
      weekly_day: isWeekly ? weeklyDay : null,
      last_injection_date: isWeekly ? lastInjectionDate : null,
    })

    setShowForm(false)
    setSelectedProduct(null)
    setDose('')
    load()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('insulin_regimens').update({ is_active: false }).eq('id', id)
    load()
  }

  const handleUpdateLastInjection = async (id: string, date: string) => {
    await supabase.from('insulin_regimens').update({ last_injection_date: date }).eq('id', id)
    load()
  }

  const getNextInjectionDate = (r: any) => {
    if (!r.last_injection_date) return null
    const last = new Date(r.last_injection_date)
    return addDays(last, 7)
  }

  const getNextInjectionInfo = (r: any) => {
    const nextDate = getNextInjectionDate(r)
    if (!nextDate) return null
    const daysUntil = differenceInDays(nextDate, new Date())
    const dateStr = format(nextDate, 'M/d（E）', { locale: ja })
    if (daysUntil < 0) return { text: `${dateStr} ※${Math.abs(daysUntil)}日超過`, urgent: true }
    if (daysUntil === 0) return { text: `今日（${dateStr}）`, urgent: true }
    if (daysUntil === 1) return { text: `明日（${dateStr}）`, urgent: false }
    return { text: `${dateStr}（${daysUntil}日後）`, urgent: false }
  }

  return (
    <div className="px-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">注射薬設定</h2>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'キャンセル' : '+ 追加'}
        </Button>
      </div>

      {/* Add form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            {/* Category */}
            <div>
              <Label className="text-xs font-semibold">カテゴリー</Label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value as ProductCategory)}
                className="w-full border rounded px-2 py-2 text-sm"
              >
                {PRODUCT_CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Product */}
            <div>
              <Label className="text-xs font-semibold">製剤名</Label>
              <select
                value={selectedProduct?.name ?? ''}
                onChange={e => {
                  const p = INSULIN_PRODUCTS.find(p => p.name === e.target.value)
                  setSelectedProduct(p ?? null)
                }}
                className="w-full border rounded px-2 py-2 text-sm"
              >
                <option value="">選択してください</option>
                {filteredProducts.map(p => (
                  <option key={p.name} value={p.name}>
                    {p.name}（{p.genericName}）
                  </option>
                ))}
              </select>
            </div>

            {selectedProduct && (
              <>
                {/* Frequency info */}
                <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
                  投与頻度: <span className="font-medium">{FREQUENCY_LABELS[selectedProduct.frequency]}</span>
                </div>

                {/* Timing (not for weekly) */}
                {selectedProduct.frequency !== 'once_weekly' && (
                  <div>
                    <Label className="text-xs font-semibold">投与タイミング</Label>
                    <select
                      value={timing}
                      onChange={e => setTiming(e.target.value)}
                      className="w-full border rounded px-2 py-2 text-sm"
                    >
                      {timingOptions.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Weekly: day picker + last injection */}
                {selectedProduct.frequency === 'once_weekly' && (
                  <>
                    <div>
                      <Label className="text-xs font-semibold">投与曜日</Label>
                      <select
                        value={weeklyDay}
                        onChange={e => setWeeklyDay(Number(e.target.value))}
                        className="w-full border rounded px-2 py-2 text-sm"
                      >
                        {WEEKDAYS.map((d, i) => (
                          <option key={i} value={i}>{d}曜日</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">最終投与日</Label>
                      <Input
                        type="date"
                        value={lastInjectionDate}
                        onChange={e => setLastInjectionDate(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Dose */}
                <div>
                  <Label className="text-xs font-semibold">用量</Label>
                  {selectedProduct.doseOptions ? (
                    <select
                      value={dose}
                      onChange={e => setDose(e.target.value)}
                      className="w-full border rounded px-2 py-2 text-sm"
                    >
                      {selectedProduct.doseOptions.map(d => (
                        <option key={d} value={d}>{d} {selectedProduct.doseUnit}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="4"
                        value={dose}
                        onChange={e => setDose(e.target.value)}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-500">{selectedProduct.doseUnit}</span>
                    </div>
                  )}
                </div>

                <Button onClick={handleAdd} className="w-full">登録</Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Registered regimens */}
      {regimens.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-400">
            注射薬が登録されていません
          </CardContent>
        </Card>
      ) : (
        regimens.map(r => {
          const isWeekly = r.frequency === 'once_weekly'
          const nextInfo = isWeekly ? getNextInjectionInfo(r) : null

          return (
            <Card key={r.id} className={nextInfo?.urgent ? 'border-orange-300 bg-orange-50' : ''}>
              <CardContent className="py-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="font-medium text-base">{r.insulin_name}</div>
                    {r.generic_name && (
                      <div className="text-xs text-gray-500">{r.generic_name}</div>
                    )}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      <Badge variant="secondary" className="text-[10px]">
                        {CATEGORY_LABELS[r.insulin_type] ?? r.insulin_type}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {isWeekly
                          ? `${WEEKDAYS[r.weekly_day]}曜日`
                          : TIMING_LABELS[r.timing] ?? r.timing}
                      </Badge>
                      <span className="text-sm font-bold">
                        {r.dose_units}{r.dose_unit ?? '単位'}
                      </span>
                    </div>

                    {/* Weekly: next injection */}
                    {isWeekly && (
                      <div className="mt-2 space-y-1">
                        {r.last_injection_date && (
                          <div className="text-xs text-gray-500">
                            最終投与: {format(new Date(r.last_injection_date), 'M/d（E）', { locale: ja })}
                          </div>
                        )}
                        {nextInfo && (
                          <div className={`text-sm font-semibold ${nextInfo.urgent ? 'text-orange-700' : 'text-blue-700'}`}>
                            次回投与: {nextInfo.text}
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs mt-1"
                          onClick={() => handleUpdateLastInjection(r.id, format(new Date(), 'yyyy-MM-dd'))}
                        >
                          今日投与した
                        </Button>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(r.id)}
                  >
                    削除
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
