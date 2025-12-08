import type { Metadata } from 'next'
import './globals.css'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export const metadata: Metadata = {
  title: 'FPL Team Optimizer',
  description: 'Optimize your Fantasy Premier League transfers with AI-powered suggestions',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme) {
                    document.documentElement.setAttribute('data-theme', theme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-4 md:px-6 border-b border-border-subtle bg-bg-sidebar/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-accent-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">FPL</span>
            </div>
            <span className="font-semibold text-text-primary hidden sm:block">
              Team Optimizer
            </span>
          </div>
          <ThemeToggle />
        </header>

        {/* Main content with header offset */}
        <main className="pt-14">
          {children}
        </main>
      </body>
    </html>
  )
}
