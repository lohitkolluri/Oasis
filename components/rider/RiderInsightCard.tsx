'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

const MAX_COLLAPSED = 120;

export function RiderInsightCard() {
  const [insight, setInsight] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch('/api/rider/insight')
      .then((r) => (r.ok ? r.json() : { insight: null }))
      .then((d) => setInsight(d.insight))
      .catch(() => setInsight(null));
  }, []);

  if (!insight) return null;

  const isLong = insight.length > MAX_COLLAPSED;
  const displayText = isLong && !expanded
    ? `${insight.slice(0, MAX_COLLAPSED).trim()}…`
    : insight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.35 }}
      className="rounded-2xl border border-uber-yellow/20 bg-uber-yellow/5 overflow-hidden shadow-[0_0_20px_rgba(255,192,67,0.08)]"
    >
      <div className="h-0.5 bg-gradient-to-r from-uber-yellow/50 via-uber-yellow/25 to-transparent" />
      <div className="flex items-start gap-3 px-4 py-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-uber-yellow/15 shrink-0 mt-0.5 border border-uber-yellow/20">
          <Lightbulb className="h-5 w-5 text-uber-yellow" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold text-uber-yellow/90 uppercase tracking-wider mb-1.5">
            Lumo Insight
          </p>
          <p className="text-[13px] text-zinc-300 leading-relaxed">
            {displayText}
          </p>
          {isLong && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-uber-yellow hover:text-uber-yellow/90"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Show more <ChevronDown className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
