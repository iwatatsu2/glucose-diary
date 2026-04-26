import type { GlucoseTiming, InsulinTiming } from '@/types/database'

interface GlucoseReading {
  date: string
  timing: GlucoseTiming
  value: number
}

interface InsulinRegimen {
  id: string
  insulin_name: string
  insulin_type: string
  timing: InsulinTiming
  dose_units: number
}

export interface InsulinSuggestion {
  type: 'increase' | 'decrease'
  targetInsulin: InsulinRegimen | null
  reason: string
  detail: string
  adjustment: string
}

const TIMING_LABELS: Record<GlucoseTiming, string> = {
  before_breakfast: '朝食前',
  after_breakfast: '朝食後',
  before_lunch: '昼食前',
  after_lunch: '昼食後',
  before_dinner: '夕食前',
  after_dinner: '夕食後',
  bedtime: '眠前',
}

// Map: which glucose timing → which insulin to adjust
const HIGH_GLUCOSE_MAP: Record<string, { insulinTiming: InsulinTiming; insulinType: string; threshold: number }> = {
  before_breakfast: { insulinTiming: 'bedtime', insulinType: 'long', threshold: 130 },
  before_lunch: { insulinTiming: 'before_breakfast', insulinType: 'rapid', threshold: 130 },
  before_dinner: { insulinTiming: 'before_lunch', insulinType: 'rapid', threshold: 130 },
  bedtime: { insulinTiming: 'before_dinner', insulinType: 'rapid', threshold: 180 },
  after_breakfast: { insulinTiming: 'before_breakfast', insulinType: 'rapid', threshold: 180 },
  after_lunch: { insulinTiming: 'before_lunch', insulinType: 'rapid', threshold: 180 },
  after_dinner: { insulinTiming: 'before_dinner', insulinType: 'rapid', threshold: 180 },
}

export function analyzeGlucoseTrend(
  readings: GlucoseReading[],
  regimens: InsulinRegimen[]
): InsulinSuggestion[] {
  const suggestions: InsulinSuggestion[] = []

  // Group readings by timing
  const byTiming = new Map<GlucoseTiming, GlucoseReading[]>()
  for (const r of readings) {
    const list = byTiming.get(r.timing) ?? []
    list.push(r)
    byTiming.set(r.timing, list)
  }

  // Check high glucose patterns (3 consecutive days)
  for (const [timing, config] of Object.entries(HIGH_GLUCOSE_MAP)) {
    const timingReadings = byTiming.get(timing as GlucoseTiming) ?? []
    // Sort by date desc, take last 3
    const sorted = [...timingReadings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

    if (sorted.length >= 3 && sorted.every(r => r.value > config.threshold)) {
      const targetInsulin = regimens.find(
        reg => reg.timing === config.insulinTiming &&
          (reg.insulin_type === config.insulinType || reg.insulin_type === 'mixed')
      ) ?? null

      const avg = Math.round(sorted.reduce((s, r) => s + r.value, 0) / sorted.length)

      suggestions.push({
        type: 'increase',
        targetInsulin,
        reason: `${TIMING_LABELS[timing as GlucoseTiming]}の血糖が3日連続で ${config.threshold} mg/dL を超えています（平均 ${avg} mg/dL）`,
        detail: targetInsulin
          ? `${targetInsulin.insulin_name}（${targetInsulin.dose_units}単位）の増量を検討`
          : `${TIMING_LABELS[config.insulinTiming]}のインスリンの増量を検討`,
        adjustment: '+1〜2単位',
      })
    }
  }

  // Check low glucose patterns (2 out of 3 days < 70)
  for (const [timing, timingReadings] of byTiming) {
    const sorted = [...timingReadings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
    const lowCount = sorted.filter(r => r.value < 70).length

    if (sorted.length >= 3 && lowCount >= 2) {
      // Find insulin for this timing
      const insulinTiming = HIGH_GLUCOSE_MAP[timing]?.insulinTiming
      const targetInsulin = insulinTiming
        ? regimens.find(reg => reg.timing === insulinTiming) ?? null
        : null

      suggestions.push({
        type: 'decrease',
        targetInsulin,
        reason: `${TIMING_LABELS[timing]}で低血糖（<70 mg/dL）が3日中${lowCount}回発生`,
        detail: targetInsulin
          ? `${targetInsulin.insulin_name}（${targetInsulin.dose_units}単位）の減量を検討`
          : `該当タイミングのインスリンの減量を検討`,
        adjustment: '-1〜2単位',
      })
    }
  }

  return suggestions
}
