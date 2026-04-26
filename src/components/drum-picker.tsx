'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface DrumPickerProps {
  value: string
  onChange: (value: string) => void
  min: number
  max: number
  step?: number
  decimals?: number
  unit?: string
  label?: string
  defaultValue?: string // 前回測定値（未入力時の初期表示位置）
}

export function DrumPicker({ value, onChange, min, max, step = 1, decimals = 0, unit = '', label, defaultValue }: DrumPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempValue, setTempValue] = useState<number>(value ? Number(value) : min)
  const listRef = useRef<HTMLDivElement>(null)
  const itemHeight = 40

  const values: number[] = []
  for (let v = min; v <= max; v = Math.round((v + step) * 1000) / 1000) {
    values.push(v)
  }

  const currentIndex = values.findIndex(v => v === tempValue)

  useEffect(() => {
    if (isOpen && listRef.current && currentIndex >= 0) {
      const scrollTo = currentIndex * itemHeight - itemHeight * 2
      listRef.current.scrollTop = Math.max(0, scrollTo)
    }
  }, [isOpen, currentIndex])

  const handleScroll = useCallback(() => {
    if (!listRef.current) return
    const scrollTop = listRef.current.scrollTop
    const index = Math.round((scrollTop + itemHeight * 2) / itemHeight)
    const clamped = Math.max(0, Math.min(values.length - 1, index))
    setTempValue(values[clamped])
  }, [values])

  const handleOpen = () => {
    const initial = value ? Number(value) : defaultValue ? Number(defaultValue) : Math.round((min + max) / 2 / step) * step
    setTempValue(initial)
    setIsOpen(true)
  }

  const handleConfirm = () => {
    onChange(tempValue.toFixed(decimals))
    setIsOpen(false)
  }

  const handleClear = () => {
    onChange('')
    setIsOpen(false)
  }

  const displayValue = value ? `${Number(value).toFixed(decimals)}` : '-'

  return (
    <>
      {/* Display cell */}
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full h-7 text-center text-[11px] rounded transition-colors ${
          value
            ? 'font-semibold text-gray-900 hover:bg-blue-50'
            : 'text-gray-300 hover:bg-gray-100'
        }`}
      >
        {displayValue}
      </button>

      {/* Modal overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={() => setIsOpen(false)}>
          <div
            className="bg-white w-full max-w-sm rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <button onClick={handleClear} className="text-sm text-gray-500">クリア</button>
              <span className="text-sm font-semibold">{label ?? ''}{unit && ` (${unit})`}</span>
              <button onClick={handleConfirm} className="text-sm font-bold text-blue-600">決定</button>
            </div>

            {/* Drum */}
            <div className="relative h-[200px] overflow-hidden">
              {/* Selection indicator */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[40px] border-y-2 border-blue-400 bg-blue-50/50 pointer-events-none z-10" />

              {/* Scroll list */}
              <div
                ref={listRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto snap-y snap-mandatory scrollbar-none"
                style={{ scrollSnapType: 'y mandatory' }}
              >
                {/* Top padding */}
                <div style={{ height: itemHeight * 2 }} />

                {values.map((v, i) => {
                  const isSelected = v === tempValue
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-center snap-center transition-all ${
                        isSelected
                          ? 'text-2xl font-bold text-blue-700'
                          : 'text-lg text-gray-400'
                      }`}
                      style={{ height: itemHeight }}
                      onClick={() => {
                        setTempValue(v)
                        if (listRef.current) {
                          listRef.current.scrollTo({
                            top: i * itemHeight,
                            behavior: 'smooth',
                          })
                        }
                      }}
                    >
                      {v.toFixed(decimals)}{unit && <span className="text-sm ml-1 text-gray-400">{unit}</span>}
                    </div>
                  )
                })}

                {/* Bottom padding */}
                <div style={{ height: itemHeight * 2 }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
