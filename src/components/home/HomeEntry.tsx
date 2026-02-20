"use client";

import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import SplashScreen from "@/components/splash/SplashScreen";
import ModuleTiles from "@/components/home/ModuleTiles";

export default function HomeEntry() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Możesz to później podpiąć pod realne ładowanie (np. user/session/fonty).
    const t = setTimeout(() => setShowSplash(false), 900);
    return () => clearTimeout(t);
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-10">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" />
        ) : (
          <ModuleTiles key="modules" />
        )}
      </AnimatePresence>
    </main>
  );
}
