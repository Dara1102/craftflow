'use client'

import { useState, useRef, useEffect } from 'react'

interface InfoPopupProps {
  title: string
  description: string
}

export function InfoPopup({ title, description }: InfoPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative inline-block" ref={popupRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
        aria-label={`Info about ${title}`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 p-3">
          <div className="flex justify-between items-start mb-1">
            <h4 className="font-medium text-gray-900 text-sm">{title}</h4>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
        </div>
      )}
    </div>
  )
}
