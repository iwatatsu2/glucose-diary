export type GlucoseTiming =
  | 'before_breakfast'
  | 'after_breakfast'
  | 'before_lunch'
  | 'after_lunch'
  | 'before_dinner'
  | 'after_dinner'
  | 'bedtime'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type InsulinType = 'rapid' | 'long' | 'mixed'

export type InsulinTiming =
  | 'before_breakfast'
  | 'before_lunch'
  | 'before_dinner'
  | 'bedtime'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          display_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          display_name?: string | null
        }
        Update: {
          display_name?: string | null
        }
      }
      daily_records: {
        Row: {
          id: string
          user_id: string
          date: string
          weight: number | null
          steps: number | null
          event_memo: string | null
          bp_morning_sys: number | null
          bp_morning_dia: number | null
          bp_morning_pulse: number | null
          bp_evening_sys: number | null
          bp_evening_dia: number | null
          bp_evening_pulse: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          weight?: number | null
          steps?: number | null
          event_memo?: string | null
          bp_morning_sys?: number | null
          bp_morning_dia?: number | null
          bp_morning_pulse?: number | null
          bp_evening_sys?: number | null
          bp_evening_dia?: number | null
          bp_evening_pulse?: number | null
        }
        Update: Partial<Omit<Database['public']['Tables']['daily_records']['Insert'], 'user_id'>>
      }
      glucose_readings: {
        Row: {
          id: string
          user_id: string
          date: string
          timing: GlucoseTiming
          value: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          timing: GlucoseTiming
          value: number
        }
        Update: {
          timing?: GlucoseTiming
          value?: number
        }
      }
      meals: {
        Row: {
          id: string
          user_id: string
          date: string
          meal_type: MealType
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          meal_type: MealType
          content: string
        }
        Update: {
          meal_type?: MealType
          content?: string
        }
      }
      insulin_regimens: {
        Row: {
          id: string
          user_id: string
          insulin_name: string
          insulin_type: InsulinType
          timing: InsulinTiming
          dose_units: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          insulin_name: string
          insulin_type: InsulinType
          timing: InsulinTiming
          dose_units: number
          is_active?: boolean
        }
        Update: {
          insulin_name?: string
          insulin_type?: InsulinType
          timing?: InsulinTiming
          dose_units?: number
          is_active?: boolean
        }
      }
      clinic_visits: {
        Row: {
          id: string
          user_id: string
          visit_date: string
          memo: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          visit_date: string
          memo?: string | null
        }
        Update: {
          visit_date?: string
          memo?: string | null
        }
      }
    }
  }
}
