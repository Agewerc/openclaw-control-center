import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OpenClaw Control Center',
  description: 'Manage your OpenClaw setup with ease',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} flex min-h-screen bg-background`}>
        <Sidebar />
        <main className="flex-1 p-8">
          {children}
        </main>
      </body>
    </html>
  )
}