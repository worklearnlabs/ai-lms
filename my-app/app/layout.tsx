import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/context/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import Script from "next/script"
import { debugUserData, updateUserName, refreshUserData, syncUserAccount } from '@/utils/auth'

const inter = Inter({ subsets: ["latin"] })

// Define type for the extended window object
interface ExtendedWindow extends Window {
  debugUserData?: typeof debugUserData;
  updateUserName?: typeof updateUserName;
  refreshUserData?: typeof refreshUserData;
  syncUserAccount?: typeof syncUserAccount;
}

export const metadata: Metadata = {
  title: "Adaptive Learning System",
  description: "A personalized learning platform",
}

export const viewport: Viewport = {
  colorScheme: "dark light",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (typeof window !== 'undefined') {
    (window as ExtendedWindow).debugUserData = debugUserData;
    (window as ExtendedWindow).updateUserName = updateUserName;
    (window as ExtendedWindow).refreshUserData = refreshUserData;
    (window as ExtendedWindow).syncUserAccount = syncUserAccount;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={inter.className}>
        {/* Script to prevent theme flash - executed before React hydration */}
        <Script
          id="theme-switcher"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const storedTheme = localStorage.getItem('theme') || 'system';
                const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                const theme = storedTheme === 'system' ? systemTheme : storedTheme;
                
                document.documentElement.classList.toggle('dark', theme === 'dark');
                document.documentElement.style.colorScheme = theme;
              } catch (e) {
                console.error('Theme initialization failed:', e);
              }
            `,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
