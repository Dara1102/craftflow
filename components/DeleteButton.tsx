'use client'

interface DeleteButtonProps {
  action: () => Promise<void>
  confirmMessage?: string
  className?: string
  children: React.ReactNode
}

export function DeleteButton({
  action,
  confirmMessage = 'Are you sure you want to delete this item?',
  className,
  children,
}: DeleteButtonProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (confirm(confirmMessage)) {
      await action()
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  )
}
