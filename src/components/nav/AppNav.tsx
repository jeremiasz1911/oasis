"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Music, Users, FileText, Home, UserCog, LogInIcon } from "lucide-react";
import Image from "next/image";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";


import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navItems = [
  { label: "Start", href: routes.home ?? "/", Icon: Home, enabled: true },
  { label: "Śpiewnik", href: routes.spiewnik, Icon: Music, enabled: true },
  { label: "Integracja", href: routes.integracja, Icon: Users, enabled: false },
  { label: "Materiały", href: routes.materialy, Icon: FileText, enabled: false },
] as const;

export default function AppNav() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === "dark" ? "light" : "dark");

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* Left: brand */}
        <Link href="/" className="flex items-center gap-2">
          <Image
                    src="/assets/logo3.png"
                    alt="Logo"
                    width={56}
                    height={30}
                    priority
                    className="bg-white/90 rounded-md border-0"
                />
            <Image
                    src="/assets/logo2.png"
                    alt="Logo"
                    width={230}
                    height={230}
                    priority
                    className="bg-white/90 rounded-md border-0"
                />    
        </Link>

        {/* Desktop nav + login */}
        <div className="hidden items-center gap-2 md:flex">
        <nav className="flex items-center gap-1">
            {navItems.map(({ label, href, Icon, enabled }) => {
            const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
            return enabled ? (
                <Button
                key={href}
                asChild
                variant={active ? "default" : "ghost"}
                className="gap-2"
                >
                <Link href={href}>
                    <Icon className="h-4 w-4" />
                    {label}
                </Link>
                </Button>
            ) : (
                <Button
                key={href}
                variant="ghost"
                className="gap-2 opacity-60 cursor-not-allowed"
                disabled
                >
                <Icon className="h-4 w-4" />
                {label}
                </Button>
            );
            })}
        </nav>
        
        <Button variant="outline" className="opacity-90 hover:opacity-100" onClick={toggleTheme} title="Przełącz motyw">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button asChild variant="outline" size="icon" aria-label="Zaloguj">
            <Link href="/admin/login">
                <UserCog className="h-5 w-5" />
            </Link>
        </Button>
       
        </div>

        {/* Mobile menu */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-[320px]">
              <SheetHeader>
                <SheetTitle>Menu</SheetTitle>
              </SheetHeader>

              <div className="mt-4 flex flex-col gap-2">
                <Link
                href="/admin/login"
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/40"
                >
                    <span className="flex items-center gap-2">
                        <LogInIcon className="h-4 w-4" />
                        Zaloguj
                    </span>
                </Link>
                {navItems.map(({ label, href, Icon, enabled }) => {
                  const active = pathname === href || (href !== "/" && pathname?.startsWith(href));
                  return enabled ? (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
                        active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted/40"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                      {active ? <span className="text-xs opacity-90">Teraz</span> : null}
                    </Link>
                  ) : (
                    <div
                      key={href}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm opacity-60"
                    >
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {label}
                      </span>
                      <span className="text-xs">Wkrótce</span>
                    </div>
                  );
                })}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}