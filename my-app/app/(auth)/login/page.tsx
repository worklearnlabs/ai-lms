"use client";

import { GalleryVerticalEnd } from "lucide-react"
import { LoginForm } from "@/components/forms/login-form"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import { useEffect } from "react"
import { deleteCookie } from "cookies-next"

export default function LoginPage() {
  // Clear auth cookie on client side when the login page loads
  useEffect(() => {
    // Remove any existing auth cookie to ensure user starts unauthenticated
    deleteCookie('auth', { path: '/' });
    // Also clear localStorage
    localStorage.removeItem("user");
  }, []);

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          Adaptive Learning System
        </Link>
        <LoginForm />
      </div>
    </div>
  )
} 