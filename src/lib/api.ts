import { supabase } from './supabase'
import type { GlucoseTiming, MealType, InsulinType, InsulinTiming } from '@/types/database'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any

// Daily Records
export async function getDailyRecord(userId: string, date: string): Promise<AnyRow | null> {
  const { data } = await supabase
    .from('daily_records')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .single()
  return data
}

export async function upsertDailyRecord(userId: string, date: string, record: {
  weight?: number | null
  temperature?: number | null
  steps?: number | null
  event_memo?: string | null
  bp_morning_sys?: number | null
  bp_morning_dia?: number | null
  bp_morning_pulse?: number | null
  bp_evening_sys?: number | null
  bp_evening_dia?: number | null
  bp_evening_pulse?: number | null
  bowel_count?: number | null
  bowel_scale?: number | null
  alcohol?: string | null
  exercise?: string | null
}) {
  return supabase
    .from('daily_records')
    .upsert({ user_id: userId, date, ...record }, { onConflict: 'user_id,date' })
}

// Glucose Readings
export async function getGlucoseReadings(userId: string, date: string) {
  const { data } = await supabase
    .from('glucose_readings')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
  return data ?? []
}

export async function getGlucoseReadingsRange(userId: string, startDate: string, endDate: string) {
  const { data } = await supabase
    .from('glucose_readings')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')
  return data ?? []
}

export async function upsertGlucoseReading(userId: string, date: string, timing: GlucoseTiming, value: number) {
  return supabase
    .from('glucose_readings')
    .upsert({ user_id: userId, date, timing, value }, { onConflict: 'user_id,date,timing' })
}

// Meals
export async function getMeals(userId: string, date: string) {
  const { data } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
  return data ?? []
}

export async function upsertMeal(userId: string, date: string, mealType: MealType, content: string) {
  // Delete existing then insert
  await supabase.from('meals').delete().eq('user_id', userId).eq('date', date).eq('meal_type', mealType)
  if (content.trim()) {
    return supabase.from('meals').insert({ user_id: userId, date, meal_type: mealType, content })
  }
}

// Insulin Regimens
export async function getInsulinRegimens(userId: string) {
  const { data } = await supabase
    .from('insulin_regimens')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('timing')
  return data ?? []
}

export async function addInsulinRegimen(userId: string, regimen: {
  insulin_name: string
  insulin_type: InsulinType
  timing: InsulinTiming
  dose_units: number
}) {
  return supabase.from('insulin_regimens').insert({ user_id: userId, ...regimen })
}

export async function updateInsulinRegimen(id: string, updates: {
  insulin_name?: string
  insulin_type?: InsulinType
  timing?: InsulinTiming
  dose_units?: number
  is_active?: boolean
}) {
  return supabase.from('insulin_regimens').update(updates).eq('id', id)
}

export async function deleteInsulinRegimen(id: string) {
  return supabase.from('insulin_regimens').update({ is_active: false }).eq('id', id)
}

// Daily Records Range
export async function getDailyRecordsRange(userId: string, startDate: string, endDate: string) {
  const { data } = await supabase
    .from('daily_records')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date')
  return data ?? []
}

// Clinic Visits
export async function getClinicVisits(userId: string) {
  const { data } = await supabase
    .from('clinic_visits')
    .select('*')
    .eq('user_id', userId)
    .order('visit_date', { ascending: false })
  return data ?? []
}

export async function addClinicVisit(userId: string, visitDate: string, memo?: string) {
  return supabase.from('clinic_visits').insert({ user_id: userId, visit_date: visitDate, memo })
}

export async function deleteClinicVisit(id: string) {
  return supabase.from('clinic_visits').delete().eq('id', id)
}
