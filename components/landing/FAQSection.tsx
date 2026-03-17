import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';

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
    <section id="faq" className="relative mx-auto max-w-6xl px-5 py-10 sm:py-14 overflow-hidden">
      {/* Subtle backdrop pattern */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.12]" aria-hidden>
        <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f0f] via-[#0f0f0f]/80 to-[#0f0f0f]" />
      </div>

      <div className="relative">
        <div className="mx-auto w-full">
          <div className="rounded-[28px] border border-[#2d2d2d] bg-[#161616] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_30px_80px_rgba(0,0,0,0.65)] overflow-hidden">
            <div className="px-6 pt-6 pb-3 sm:px-8 sm:pt-8">
              <p className="text-[26px] sm:text-[30px] font-semibold tracking-[-0.04em] text-white">
                <span className="bg-gradient-to-b from-[#a78bfa] to-[#7dd3fc] bg-clip-text text-transparent">
                  Frequently asked
                </span>{' '}
                questions
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/45">
                Quick answers about coverage, pricing, and payouts.
              </p>
            </div>

            <Accordion.Root type="single" collapsible className="px-5 pb-5 sm:px-6 sm:pb-6">
              <div className="rounded-2xl border border-[#2d2d2d] bg-[#101010]">
                {faqs.map((f, idx) => (
                  <Accordion.Item
                    key={f.q}
                    value={f.q}
                    className={idx === 0 ? '' : 'border-t border-[#2d2d2d]'}
                  >
                    <Accordion.Header>
                      <Accordion.Trigger className="group flex w-full items-center gap-4 px-5 py-4 text-left outline-none hover:bg-white/[0.03] transition-colors">
                        <span className="w-6 text-[12px] font-semibold tabular-nums text-[#a78bfa]">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="flex-1 text-[15px] font-medium tracking-[-0.01em] text-white/80 group-hover:text-white">
                          {f.q}
                        </span>
                        <ChevronDown className="h-4 w-4 text-white/35 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </Accordion.Trigger>
                    </Accordion.Header>
                    <Accordion.Content className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                      <div className="px-5 pb-5 pl-[calc(1.5rem+1.5rem)]">
                        <p className="text-[13px] leading-relaxed text-white/55">{f.a}</p>
                      </div>
                    </Accordion.Content>
                  </Accordion.Item>
                ))}
              </div>
            </Accordion.Root>
          </div>
        </div>
      </div>
    </section>
  );
}

