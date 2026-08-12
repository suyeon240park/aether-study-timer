import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/contexts/auth-context"
import { ThemeProvider } from "@/components/theme-provider"
import { getSiteUrl, withBasePath } from "@/lib/site-paths"

const inter = Inter({ subsets: ["latin"] })
const siteUrl = getSiteUrl()

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "Aether Study Timer",
  title: "Aether Study Timer",
  description: "A minimalistic Pomodoro study timer designed to help you focus, track study habits, and boost motivation through a unique reward system.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: withBasePath("/favicon/favicon.ico") },
      { url: withBasePath("/favicon/favicon-16x16.png"), sizes: "16x16", type: "image/png" },
      { url: withBasePath("/favicon/favicon-32x32.png"), sizes: "32x32", type: "image/png" },
      { url: withBasePath("/favicon/android-chrome-192x192.png"), sizes: "192x192", type: "image/png" },
      { url: withBasePath("/favicon/android-chrome-512x512.png"), sizes: "512x512", type: "image/png" },
    ],
    shortcut: withBasePath("/favicon/favicon.ico"),
    apple: [
      { url: withBasePath("/favicon/apple-touch-icon.png"), sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "Aether Study Timer",
    description: "A minimalistic Pomodoro study timer designed to help you focus, track study habits, and boost motivation through a unique reward system.",
    url: "/",
    siteName: "Aether Study Timer",
    images: [
      {
        url: withBasePath("/favicon/android-chrome-512x512.png"),
        width: 512,
        height: 512,
        alt: "Aether Study Timer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Aether Study Timer",
    description: "A minimalistic Pomodoro study timer designed to help you focus, track study habits, and boost motivation through a unique reward system.",
    images: [withBasePath("/favicon/android-chrome-512x512.png")],
  },
  manifest: withBasePath("/favicon/site.webmanifest"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Aether Study Timer",
  },
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // Allow user to zoom for accessibility
  viewportFit: "cover", // Support for notched devices (iPhone X+)
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          themes={["light", "dark", "rose", "forest", "midnight", "nord"]}
          enableSystem={false}
          storageKey="aether-timer-theme"
        >
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
