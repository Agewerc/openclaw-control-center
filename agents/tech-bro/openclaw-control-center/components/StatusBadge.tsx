import clsx from 'clsx'

interface StatusBadgeProps {
  status: 'active' | 'disabled' | 'running' | 'paused' | 'failed' | 'info' | 'warning' | 'error'
  children: React.ReactNode
}

export default function StatusBadge({ status, children }: StatusBadgeProps) {
  const statusConfig = {
    active: { color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    disabled: { color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' },
    running: { color: 'bg-green-500/10 text-green-600 border-green-500/20' },
    paused: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    failed: { color: 'bg-red-500/10 text-red-600 border-red-500/20' },
    info: { color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
    warning: { color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20' },
    error: { color: 'bg-red-500/10 text-red-600 border-red-500/20' },
  }

  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      statusConfig[status].color
    )}>
      {children}
    </span>
  )
}