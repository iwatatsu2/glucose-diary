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
  defaultValue?: string
}

export function DrumPicker({ value, onChange, min, max, step = 1, decimals = 0, unit = '', label, defaultValue }: DrumPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tempValue, setTempValue] = useState<number>(min)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isScrolling = useRef(false)
  const ITEM_H = 44

  // Generate values lazily
  const valuesRef = useRef<number[]>([])
  if (valuesRef.current.length === 0 || valuesRef.current[0] !== min) {
    const arr: number[] = []
    for (let v = min; v <= max; v = Math.round((v + step) * 1000) / 1000) {
      arr.push(v)
    }
    valuesRef.current = arr
  }
  const values = valuesRef.current

  const getIndexForValue = useCallback((val: number) => {
    // Binary-ish search for nearest
    let best = 0
    let bestDiff = Math.abs(values[0] - val)
    for (let i = 1; i < values.length; i++) {
      const diff = Math.abs(values[i] - val)
      if (diff < bestDiff) { best = i; bestDiff = diff }
      if (diff > bestDiff) break // values are sorted, so we can break early
    }
    return best
  }, [values])

  const scrollToIndex = useCallback((index: number, smooth = false) => {
    if (!scrollRef.current) return
    const top = index * ITEM_H
    if (smooth) {
      scrollRef.current.scrollTo({ top, behavior: 'smooth' })
    } else {
      scrollRef.current.scrollTop = top
    }
  }, [])

  // On open, scroll to the right position
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      const initial = value ? Number(value) : defaultValue ? Number(defaultValue) : Math.round((min + max) / 2 / step) * step
      const idx = getIndexForValue(initial)
      setTempValue(values[idx])
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        scrollToIndex(idx, false)
      })
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle scroll end → snap to nearest item
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return
    isScrolling.current = true

    if (scrollTimer.current) clearTimeout(scrollTimer.current)
    scrollTimer.current = setTimeout(() => {
      if (!scrollRef.current) return
      isScrolling.current = false
      const scrollTop = scrollRef.current.scrollTop
      const index = Math.round(scrollTop / ITEM_H)
      const clamped = Math.max(0, Math.min(values.length - 1, index))
      setTempValue(values[clamped])
      // Snap to exact position
      scrollToIndex(clamped, true)
    }, 80)
  }, [values, scrollToIndex])

  const handleOpen = () => {
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

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40" onClick={() => setIsOpen(false)}>
          <div
            className="bg-white w-full max-w-sm rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <button onClick={handleClear} className="text-sm text-gray-500 active:text-gray-800 py-1 px-2">クリア</button>
              <span className="text-sm font-semibold">{label ?? ''}{unit && ` (${unit})`}</span>
              <button onClick={handleConfirm} className="text-sm font-bold text-blue-600 active:text-blue-800 py-1 px-2">決定</button>
            </div>

            {/* Drum */}
            <div className="relative h-[220px] overflow-hidden">
              {/* Selection indicator */}
              <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-[44px] border-y-2 border-blue-400 bg-blue-50/40 pointer-events-none z-10 rounded" />

              {/* Scroll container - native momentum scroll */}
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="h-full overflow-y-auto"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {/* Top spacer: 2 items worth so first item can be centered */}
                <div style={{ height: ITEM_H * 2 }} />

                {values.map((v, i) => {
                  const isSelected = v === tempValue && !isScrolling.current
                  return (
                    <div
                      key={i}
                      style={{ height: ITEM_H }}
                      className={`flex items-center justify-center ${
                        isSelected
                          ? 'text-[22px] font-bold text-blue-700'
                          : 'text-lg text-gray-400'
                      }`}
                      onClick={() => {
                        setTempValue(v)
                        scrollToIndex(i, true)
                      }}
                    >
                      {v.toFixed(decimals)}{unit && <span className="text-sm ml-1 text-gray-400">{unit}</span>}
                    </div>
                  )
                })}

                {/* Bottom spacer */}
                <div style={{ height: ITEM_H * 2 }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
