export type ProductCategory = 'ultra_ultra_rapid' | 'ultra_rapid' | 'rapid' | 'intermediate' | 'long' | 'mixed' | 'glp1_daily' | 'glp1_weekly' | 'gip_glp1' | 'insulin_weekly'

export interface InsulinProduct {
  name: string
  genericName: string
  category: ProductCategory
  frequency: 'each_meal' | 'once_daily' | 'twice_daily' | 'once_weekly'
  doseOptions?: number[] // 固定用量の選択肢（GLP-1など）
  doseUnit: string       // 単位 or mg
  adjustable: boolean    // 単位数を自由入力できるか
}

export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: 'ultra_ultra_rapid', label: '超超速効型インスリン' },
  { value: 'ultra_rapid', label: '超速効型インスリン' },
  { value: 'rapid', label: '速効型インスリン' },
  { value: 'intermediate', label: '中間型インスリン' },
  { value: 'long', label: '持効型インスリン' },
  { value: 'mixed', label: '混合型インスリン' },
  { value: 'glp1_daily', label: 'GLP-1受容体作動薬（毎日）' },
  { value: 'glp1_weekly', label: 'GLP-1受容体作動薬（週1回）' },
  { value: 'gip_glp1', label: 'GIP/GLP-1受容体作動薬' },
  { value: 'insulin_weekly', label: '週1回インスリン' },
]

export const INSULIN_PRODUCTS: InsulinProduct[] = [
  // 超超速効型（Ultra-Ultra-Rapid）
  { name: 'フィアスプ', genericName: 'インスリン アスパルト', category: 'ultra_ultra_rapid', frequency: 'each_meal', doseUnit: '単位', adjustable: true },
  { name: 'ルムジェブ', genericName: 'インスリン リスプロ', category: 'ultra_ultra_rapid', frequency: 'each_meal', doseUnit: '単位', adjustable: true },

  // 超速効型（Ultra-Rapid）
  { name: 'ノボラピッド', genericName: 'インスリン アスパルト', category: 'ultra_rapid', frequency: 'each_meal', doseUnit: '単位', adjustable: true },
  { name: 'ヒューマログ', genericName: 'インスリン リスプロ', category: 'ultra_rapid', frequency: 'each_meal', doseUnit: '単位', adjustable: true },
  { name: 'アピドラ', genericName: 'インスリン グルリジン', category: 'ultra_rapid', frequency: 'each_meal', doseUnit: '単位', adjustable: true },

  // 速効型（Regular）
  { name: 'ヒューマリンR', genericName: 'レギュラーインスリン', category: 'rapid', frequency: 'each_meal', doseUnit: '単位', adjustable: true },
  { name: 'ノボリンR', genericName: 'レギュラーインスリン', category: 'rapid', frequency: 'each_meal', doseUnit: '単位', adjustable: true },

  // 中間型
  { name: 'ノボリンN', genericName: 'NPHインスリン', category: 'intermediate', frequency: 'twice_daily', doseUnit: '単位', adjustable: true },
  { name: 'ヒューマリンN', genericName: 'NPHインスリン', category: 'intermediate', frequency: 'twice_daily', doseUnit: '単位', adjustable: true },

  // 持効型（Long-Acting）
  { name: 'トレシーバ', genericName: 'インスリン デグルデク', category: 'long', frequency: 'once_daily', doseUnit: '単位', adjustable: true },
  { name: 'ランタス', genericName: 'インスリン グラルギン', category: 'long', frequency: 'once_daily', doseUnit: '単位', adjustable: true },
  { name: 'ランタスXR', genericName: 'インスリン グラルギン U300', category: 'long', frequency: 'once_daily', doseUnit: '単位', adjustable: true },
  { name: 'レベミル', genericName: 'インスリン デテミル', category: 'long', frequency: 'once_daily', doseUnit: '単位', adjustable: true },

  // 混合型
  { name: 'ノボラピッド30ミックス', genericName: 'アスパルト30/70', category: 'mixed', frequency: 'twice_daily', doseUnit: '単位', adjustable: true },
  { name: 'ノボラピッド50ミックス', genericName: 'アスパルト50/50', category: 'mixed', frequency: 'twice_daily', doseUnit: '単位', adjustable: true },
  { name: 'ノボラピッド70ミックス', genericName: 'アスパルト70/30', category: 'mixed', frequency: 'twice_daily', doseUnit: '単位', adjustable: true },
  { name: 'ヒューマログミックス25', genericName: 'リスプロ25/75', category: 'mixed', frequency: 'twice_daily', doseUnit: '単位', adjustable: true },
  { name: 'ヒューマログミックス50', genericName: 'リスプロ50/50', category: 'mixed', frequency: 'twice_daily', doseUnit: '単位', adjustable: true },
  { name: 'ライゾデグ', genericName: 'デグルデク/アスパルト', category: 'mixed', frequency: 'twice_daily', doseUnit: '単位', adjustable: true },

  // GLP-1 毎日
  { name: 'ビクトーザ', genericName: 'リラグルチド', category: 'glp1_daily', frequency: 'once_daily', doseUnit: 'mg', doseOptions: [0.3, 0.6, 0.9], adjustable: false },
  { name: 'リキスミア', genericName: 'リキシセナチド', category: 'glp1_daily', frequency: 'once_daily', doseUnit: 'μg', doseOptions: [10, 20], adjustable: false },
  { name: 'バイエッタ', genericName: 'エキセナチド', category: 'glp1_daily', frequency: 'twice_daily', doseUnit: 'μg', doseOptions: [5, 10], adjustable: false },

  // GLP-1 週1回
  { name: 'オゼンピック', genericName: 'セマグルチド', category: 'glp1_weekly', frequency: 'once_weekly', doseUnit: 'mg', doseOptions: [0.25, 0.5, 1.0], adjustable: false },
  { name: 'トルリシティ', genericName: 'デュラグルチド', category: 'glp1_weekly', frequency: 'once_weekly', doseUnit: 'mg', doseOptions: [0.75], adjustable: false },
  { name: 'ビデュリオン', genericName: 'エキセナチドLAR', category: 'glp1_weekly', frequency: 'once_weekly', doseUnit: 'mg', doseOptions: [2.0], adjustable: false },

  // GIP/GLP-1
  { name: 'マンジャロ', genericName: 'チルゼパチド', category: 'gip_glp1', frequency: 'once_weekly', doseUnit: 'mg', doseOptions: [2.5, 5.0, 7.5, 10.0, 12.5, 15.0], adjustable: false },

  // 週1回インスリン
  { name: 'アウィクリ', genericName: 'インスリン イコデク', category: 'insulin_weekly', frequency: 'once_weekly', doseUnit: '単位', adjustable: true },
]

export const FREQUENCY_LABELS: Record<string, string> = {
  each_meal: '毎食前',
  once_daily: '1日1回',
  twice_daily: '1日2回',
  once_weekly: '週1回',
}

export const TIMING_OPTIONS_BY_FREQUENCY: Record<string, { value: string; label: string }[]> = {
  each_meal: [
    { value: 'before_breakfast', label: '朝食前' },
    { value: 'before_lunch', label: '昼食前' },
    { value: 'before_dinner', label: '夕食前' },
  ],
  once_daily: [
    { value: 'before_breakfast', label: '朝食前' },
    { value: 'before_lunch', label: '昼食前' },
    { value: 'before_dinner', label: '夕食前' },
    { value: 'bedtime', label: '眠前' },
  ],
  twice_daily: [
    { value: 'before_breakfast', label: '朝食前' },
    { value: 'before_dinner', label: '夕食前' },
  ],
  once_weekly: [
    { value: 'weekly', label: '週1回（曜日指定）' },
  ],
}
