"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ConfettiProps {
  active: boolean;
  onDone?: () => void;
}

const COLORS = ["#10b981", "#06b6d4", "#84cc16", "#f59e0b", "#ec4899", "#8b5cf6"];

export function Confetti({ active, onDone }: ConfettiProps) {
  const [pieces, setPieces] = React.useState<
    { id: number; x: number; y: number; rot: number; color: string; size: number; delay: number }[]
  >([]);

  React.useEffect(() => {
    if (active) {
      const next = Array.from({ length: 80 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        rot: Math.random() * 720 - 360,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
        delay: Math.random() * 0.3,
      }));
      setPieces(next);
      const t = setTimeout(() => {
        setPieces([]);
        onDone?.();
      }, 2500);
      return () => clearTimeout(t);
    } else {
      setPieces([]);
    }
  }, [active, onDone]);

  if (pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: `${p.y}vh`, rotate: p.rot, opacity: 1 }}
          animate={{ x: `${p.x + (Math.random() - 0.5) * 30}vw`, y: "110vh", rotate: p.rot + 720, opacity: [1, 1, 0.7, 0] }}
          transition={{ duration: 2.2 + Math.random() * 0.5, delay: p.delay, ease: "easeIn" }}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size * 0.4,
            background: p.color,
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}
