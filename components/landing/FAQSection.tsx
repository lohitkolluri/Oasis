'use client';

import * as Accordion from '@radix-ui/react-accordion';
import { Plus } from 'lucide-react';

const faqs = [
  {
    q: 'What does Oasis cover?',
    a: 'Loss of income when external disruptions reduce deliveries in your zone, like extreme weather or local restrictions. Not health, life, accidents, or vehicle repairs.',
  },
  {
    q: 'How is pricing structured?',
    a: 'Weekly. Coverage and premiums run week-to-week to match delivery partner cashflows.',
  },
  {
    q: 'Do riders need to file claims?',
    a: 'No. This is parametric coverage: when trigger thresholds are met, payouts are created automatically with zero manual claims processing.',
  },
  {
    q: 'What data powers triggers?',
    a: 'External signals (weather and disruption indicators) combined with your working zone to determine eligibility.',
  },
  {
    q: 'When do payouts happen?',
    a: 'When verified disruption signals cross predefined thresholds for your zone during an active weekly coverage window.',
  },
];

export function FAQSection() {
  return (
    <section id="faq" className="mx-auto max-w-4xl px-5 py-20 sm:py-32 relative z-10">
      <div className="flex flex-col items-center text-center reveal-in-up mb-16" style={{ ['--d' as any]: '80ms' }}>
        <h2 className="text-[32px] sm:text-[42px] font-bold tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 leading-tight">
          Frequently asked questions
        </h2>
        <p className="mt-4 text-[16px] leading-relaxed text-white/50 tracking-tight">
          Quick answers about coverage, pricing, and payouts.
        </p>
      </div>

      <Accordion.Root type="single" collapsible className="w-full">
        {faqs.map((f, idx) => (
          <Accordion.Item
            key={f.q}
            value={f.q}
            className="border-b border-white/10 reveal-in-up overflow-hidden"
            style={{ ['--d' as any]: `${(idx + 1) * 100}ms` } as any}
          >
            <Accordion.Header>
              <Accordion.Trigger className="group flex w-full items-center justify-between py-6 outline-none transition-colors">
                <div className="flex items-center gap-6">
                  <span className="text-[14px] font-mono font-bold tabular-nums text-white/30 transition-colors group-hover:text-white/60">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[18px] sm:text-[20px] font-medium tracking-tight text-white/80 transition-colors group-hover:text-white text-left">
                    {f.q}
                  </span>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-transform duration-300 group-data-[state=open]:rotate-45 group-hover:bg-white/10 shrink-0 ml-4">
                  <Plus className="h-4 w-4 text-white/70" />
                </div>
              </Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
              <div className="pb-8 pl-[3.5rem] pr-12">
                <p className="text-[16px] leading-relaxed text-white/50">{f.a}</p>
              </div>
            </Accordion.Content>
          </Accordion.Item>
        ))}
      </Accordion.Root>
    </section>
  );
}
