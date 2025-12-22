import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'FPL Transfer Optimizer',
  description: 'Get mathematically optimal transfer suggestions for your Fantasy Premier League team',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-theme="dark">
      <body className="antialiased min-h-screen">
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}
