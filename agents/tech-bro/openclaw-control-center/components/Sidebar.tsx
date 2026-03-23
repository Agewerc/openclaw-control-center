'use client'

import { 
  LayoutDashboard, 
  Users, 
  Clock, 
  Folder,
  Lightbulb,
  KanbanSquare,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/agents', icon: Users, label: 'Agents' },
  { href: '/ideas', icon: Lightbulb, label: 'Ideas' },
  { href: '/board', icon: KanbanSquare, label: 'Board' },
  { href: '/cron-jobs', icon: Clock, label: 'Cron Jobs' },
  { href: '/logs', icon: FileText, label: 'Logs' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside className={clsx(
      'flex flex-col border-r border-border bg-card transition-all duration-300',
      collapsed ? 'w-20' : 'w-64'
    )}>
      <div className="flex items-center justify-between p-6 border-b border-border">
        <div className={clsx(
          'flex items-center gap-3 transition-opacity',
          collapsed ? 'opacity-0 w-0' : 'opacity-100'
        )}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold">OC</span>
          </div>
          <div>
            <h1 className="font-semibold">OpenClaw</h1>
            <p className="text-sm text-muted-foreground">Control Center</p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 hover:bg-accent rounded-md transition-colors"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                    isActive 
                      ? 'bg-primary/10 text-primary border-l-4 border-primary' 
                      : 'hover:bg-accent'
                  )}
                >
                  <item.icon size={20} className={clsx(
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )} />
                  <span className={clsx(
                    'transition-opacity',
                    collapsed ? 'opacity-0 w-0' : 'opacity-100'
                  )}>
                    {item.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-border">
        <button className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-accent transition-colors w-full">
          <Settings size={20} className="text-muted-foreground" />
          <span className={clsx(
            'transition-opacity',
            collapsed ? 'opacity-0 w-0' : 'opacity-100'
          )}>
            Settings
          </span>
        </button>
      </div>
    </aside>
  )
}