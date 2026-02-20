"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function SplashScreen() {
  return (
    <motion.div
      className="flex w-full flex-col items-center justify-center gap-6"
      initial={{ opacity: 0, scale: 0.98, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.985, y: -6 }}
      transition={{ duration: 0.35 }}
    >
      <motion.div
        className="relative flex h-50 w-50 items-center justify-center shadow-sm"
        animate={{ rotate: [0, 2, -2, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.2 }}
      >
        
           <Image
              src="/assets/logo.png"
              alt="Logo"
              width={230}
              height={230}
              priority
              className="drop-shadow-sm border rounded-xl"
            />
        
      </motion.div>

      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Wczytywanie…</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Śpiewnik • Integracja • Materiały
        </p>
      </div>

      <motion.div
        className="h-1.5 w-56 overflow-hidden rounded-full bg-muted"
        initial={{ opacity: 0.8 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="h-full w-1/3 rounded-full bg-foreground"
          animate={{ x: ["-120%", "320%"] }}
          transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </motion.div>
  );
}
