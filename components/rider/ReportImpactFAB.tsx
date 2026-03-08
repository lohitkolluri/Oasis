'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag } from 'lucide-react';
import { ReportDeliveryImpact } from './ReportDeliveryImpact';

export function ReportImpactFAB() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-24 right-4 z-40 safe-area-br flex justify-end">
        <motion.button
          type="button"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[48px] items-center justify-center gap-2.5 rounded-full border border-uber-yellow/40 bg-uber-yellow/20 px-5 py-3 shadow-lg shadow-black/20 active:scale-95 transition-transform"
          aria-label="Report delivery issue"
        >
          <Flag className="h-5 w-5 text-uber-yellow shrink-0 -translate-y-px" strokeWidth={2} />
          <span className="text-sm font-semibold leading-none text-uber-yellow/90">
            Report Delivery Issue
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
