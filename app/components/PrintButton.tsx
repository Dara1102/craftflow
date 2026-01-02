'use client'

export default function PrintButton({ className }: { className?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className={className}
    >
      Print Sheet
    </button>
  )
}
