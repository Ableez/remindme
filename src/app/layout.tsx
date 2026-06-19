import type { Metadata, Viewport } from "next";
import { Stack_Sans_Headline } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/ui/themes";
import ConvexClientProvider from "./ConvexClientProvider";
import "./globals.css";
import { cn } from "#/lib/utils";

const stackSans = Stack_Sans_Headline({
  subsets: ["latin"],
  variable: "--font-stack-sans",
  weight: ["200", "300", "400", "500", "600", "700"],
  display: "swap",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL("https://remindme.app"),
  title: {
    default: "RemindMe — Project Journal & Reminders",
    template: "%s | RemindMe",
  },
  description:
    "A personal journal tied to your GitHub repos. Sticky notes, reminder lists, AI-powered daily catchups, and an agent that manages your project notes via natural language.",
  keywords: [
    "journal",
    "reminders",
    "github",
    "project management",
    "notes",
    "daily catchup",
    "ai assistant",
  ],
  authors: [{ name: "ableez" }],
  creator: "ableez",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "RemindMe",
    title: "RemindMe — Project Journal & Reminders",
    description:
      "A personal journal tied to your GitHub repos. Sticky notes, reminders, and AI-powered daily catchups.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RemindMe — Project Journal & Reminders",
    description:
      "A personal journal tied to your GitHub repos. Sticky notes, reminders, and AI-powered daily catchups.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", stackSans.variable)}
      suppressHydrationWarning
    >
      <body
        className={cn(
          "min-h-full flex flex-col font-sans antialiased"
        )}
      >
        <ClerkProvider appearance={{ theme: dark }}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
