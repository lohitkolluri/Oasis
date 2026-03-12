'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag } from 'lucide-react';
import { ReportDeliveryImpact } from './ReportDeliveryImpact';

export function ReportImpactFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-[5.5rem] right-4 z-40 safe-area-br flex justify-end">
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-uber-yellow/40 bg-zinc-900/95 backdrop-blur-lg px-5 py-3 shadow-xl shadow-black/30 active:scale-[0.94] transition-transform"
          aria-label="Report delivery issue"
        >
          <Flag className="h-[18px] w-[18px] text-uber-yellow shrink-0" strokeWidth={2.2} />
          <span className="text-[13px] font-bold leading-none text-uber-yellow/90">
            Report Issue
          </span>
        </motion.button>
      </div>
      <ReportDeliveryImpact
        open={open}
        onOpenChange={setOpen}
        renderTrigger={false}
      />
    </>
  );
}
