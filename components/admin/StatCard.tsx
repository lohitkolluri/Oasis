"use client";

import { motion } from "framer-motion";
import { Cloud, ShieldAlert, TrendingUp, Users, FileCheck, Flag } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type IconName = "TrendingUp" | "Cloud" | "ShieldAlert" | "Users" | "FileCheck" | "Flag";

const iconMap: Record<IconName, LucideIcon> = {
  TrendingUp,
  Cloud,
  ShieldAlert,
  Users,
  FileCheck,
  Flag,
};

interface StatCardProps {
  label: string;
  value: string | number;
  icon: IconName;
  accent?: "default" | "emerald" | "amber" | "red" | "violet";
  delay?: number;
  subtext?: string;
}

const valueColors: Record<string, string> = {
  default: "text-zinc-100",
  emerald: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
  violet: "text-violet-400",
};

export function StatCard({
  label,
  value,
  icon,
  accent = "default",
  delay = 0,
  subtext,
}: StatCardProps) {
  const Icon = iconMap[icon] ?? TrendingUp;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay }}
      className="rounded-xl border border-zinc-800 bg-zinc-900 p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
          {label}
        </span>
        <Icon className="h-3.5 w-3.5 text-zinc-700" />
      </div>
      <p
        className={`text-[26px] font-bold tabular-nums tracking-tight leading-none ${valueColors[accent]}`}
      >
        {value}
      </p>
      {subtext && <p className="text-xs text-zinc-600 mt-2">{subtext}</p>}
    </motion.div>
  );
}
