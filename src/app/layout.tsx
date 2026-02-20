import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import AppNav from "@/components/nav/AppNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Śpiewnik / Animacje / Materiały",
  description: "Aplikacja: Śpiewnik, Animacje, Materiały",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body className={inter.className}>
       <ThemeProvider >
        <AuthProvider>
          
          <div className="min-h-dvh bg-background text-foreground">
            <AppNav />
            {children}
          </div>
        </AuthProvider>
      </ThemeProvider>
      </body>
    </html>
  );
}
