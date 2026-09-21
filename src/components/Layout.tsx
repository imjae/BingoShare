import type { ReactNode } from 'react'

type Props = {
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

export default function Layout({ title, subtitle, children, footer }: Props) {
  return (
    <div className="min-h-dvh bg-surface text-ink">
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 px-4 py-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight break-keep">{title}</h1>
          {subtitle ? <p className="text-sm text-ink-muted break-keep">{subtitle}</p> : null}
        </header>
        {children}
        {footer ? <div className="mt-auto pt-2">{footer}</div> : null}
      </div>
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary'
          ? 'bg-accent text-white active:brightness-90'
          : 'border border-line bg-surface-sunken text-ink active:brightness-95',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function Notice({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'error'; children: ReactNode }) {
  const toneClass = {
    info: 'border-line bg-surface-sunken text-ink-muted',
    warn: 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300',
    error: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
  }[tone]

  return <div className={`rounded-lg border px-3 py-2 text-xs break-keep ${toneClass}`}>{children}</div>
}
