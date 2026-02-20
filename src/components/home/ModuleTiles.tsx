"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Music, Users, FileText, Lock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { routes } from "@/lib/routes";
import { cn } from "@/lib/utils";

const items = [
  {
    title: "Śpiewnik",
    desc: "Wyszukuj utwory, kategorie, tryb prezentacji.",
    href: routes.spiewnik,
    Icon: Music,
    enabled: true,
    badge: "Dostępne",
  },
  {
    title: "Integracja",
    desc: "Integracja społeczna: aktywności, spotkania, zasoby.",
    href: routes.integracja,
    Icon: Users,
    enabled: false,
    badge: "Wkrótce",
  },
  {
    title: "Materiały",
    desc: "Pliki, PDF, linki, wideo — wszystko w jednym miejscu.",
    href: routes.materialy,
    Icon: FileText,
    enabled: false,
    badge: "Wkrótce",
  },
] as const;

const container = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, staggerChildren: 0.08 },
  },
};

const tile = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28 } },
};

export default function ModuleTiles() {
  return (
    <motion.div
      className="w-full"
      variants={container}
      initial="hidden"
      animate="show"
    >
      <div className="mx-auto w-full max-w-5xl">
        {/* LOGO */}
        <motion.div
          className="mx-auto mb-6 flex w-full justify-center"
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <motion.div
            className="relative"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* Podmień src na swoje logo */}
            <Image
              src="/assets/logo.png"
              alt="Logo"
              width={230}
              height={230}
              priority
              className="drop-shadow-sm border rounded-xl"
            />
            {/* subtelna poświata */}
            <div className="pointer-events-none absolute inset-0 -z-10 blur-2xl opacity-30 bg-gradient-to-r from-primary/40 via-primary/20 to-transparent rounded-full" />
          </motion.div>
        </motion.div>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Wybierz moduł</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Trzy sekcje — jedna aplikacja.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {items.map(({ title, desc, href, Icon, enabled, badge }) => {
            const CardInner = (
              <Card
                className={cn(
                  "relative h-full overflow-hidden transition-transform",
                  enabled
                    ? "group-hover:-translate-y-1"
                    : "opacity-80"
                )}
              >
                {/* gradient/shimmer */}
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 opacity-0 transition-opacity",
                    enabled ? "group-hover:opacity-100" : "opacity-100"
                  )}
                >
                  <div className="absolute -inset-20 rotate-12 bg-gradient-to-r from-transparent via-primary/10 to-transparent blur-xl" />
                </div>

                <CardContent className="relative flex h-full flex-col gap-3 p-6">
                  {/* badge */}
                  <div className="absolute right-4 top-4">
                    <div
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs",
                        enabled
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {badge}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl border bg-card",
                        enabled ? "ring-1 ring-primary/15" : ""
                      )}
                    >
                      <Icon className={cn("h-6 w-6", enabled ? "" : "opacity-70")} />
                    </div>

                    <div className="text-xl font-semibold">{title}</div>
                  </div>

                  <div className="text-sm text-muted-foreground">{desc}</div>

                  <div className="mt-auto pt-2 text-sm font-medium">
                    {enabled ? (
                      <span className="inline-flex items-center gap-2">
                        Otwórz <span className="transition-transform group-hover:translate-x-1">→</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 text-muted-foreground">
                        <Lock className="h-4 w-4" /> Niedostępne
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );

            return (
              <motion.div key={href} variants={tile}>
                {enabled ? (
                  <Link href={href} className="group block">
                    {CardInner}
                  </Link>
                ) : (
                  <div className="group block cursor-not-allowed">{CardInner}</div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* mały dopisek */}
        <motion.div
          className="mt-6 text-center text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          Integracja i Materiały pojawią się w kolejnych etapach.
        </motion.div>
      </div>
    </motion.div>
  );
}