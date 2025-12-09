'use client'

interface DuplicateButtonProps {
  action: () => Promise<void>
  className?: string
  children: React.ReactNode
}

export function DuplicateButton({
  action,
  className,
  children,
}: DuplicateButtonProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await action()
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  )
}
