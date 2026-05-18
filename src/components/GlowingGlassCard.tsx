"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface GlowingGlassCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** CSS gradient string, e.g. "linear-gradient(137deg, #10B981 0%, #06b6d4 100%)" */
  glowGradient: string;
  delay?: number;
}

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: (delay: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

export default function GlowingGlassCard({ icon, title, description, glowGradient, delay = 0 }: GlowingGlassCardProps) {
  return (
    <motion.div
      custom={delay}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={cardVariants}
      className="relative group"
    >
      {/* ── Outer Glow ─────────────────────────────────────────────── */}
      <div
        className="absolute -inset-1 opacity-40 group-hover:opacity-60 rounded-[40px] blur-[45px] pointer-events-none transition-opacity duration-700"
        style={{ background: glowGradient }}
      />

      {/* ── Glass Card ─────────────────────────────────────────────── */}
      <div className="relative z-10 p-8 rounded-[32px] border border-slate-200 dark:border-white/10 backdrop-blur-[30px] bg-white/70 dark:bg-black/40 shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] transition-all duration-500 group-hover:bg-white/90 dark:group-hover:border-white/25 dark:group-hover:bg-black/60">
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border border-white/10"
          style={{ background: glowGradient }}
        >
          <div className="text-white">{icon}</div>
        </div>

        {/* Content */}
        <h3 className="font-heading text-2xl text-slate-900 dark:text-white mb-3 drop-shadow-md leading-tight">
          {title}
        </h3>
        <p className="text-sm text-slate-600 dark:text-white/60 font-body leading-relaxed">
          {description}
        </p>
      </div>
    </motion.div>
  );
}
