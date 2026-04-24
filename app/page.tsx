import { CoverageBoundariesSection } from '@/components/landing/CoverageBoundariesSection';
import { EditorialTextSection } from '@/components/landing/EditorialTextSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { FeatureGridSection } from '@/components/landing/FeatureGridSection';
import { FinalCTASection } from '@/components/landing/FinalCTASection';
import { Footer } from '@/components/landing/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingShell } from '@/components/landing/LandingShell';
import { MiddleSection } from '@/components/landing/MiddleSection';
import { PrinciplesSection } from '@/components/landing/PrinciplesSection';
import { createClient } from '@/lib/supabase/server';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Oasis',
  description:
    "Weekly parametric wage protection for India's Q-commerce delivery partners. Automated payouts when disruptions strike — zero claims paperwork.",
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <LandingShell>
      <LandingNav />
      <main>
        <HeroSection />

        <EditorialTextSection
          eyebrow="Built for purpose"
          body={
            <>
              Oasis is purpose-built for weekly income protection. External signals are mapped to
              where you work, and parametric rules create payouts automatically when disruption
              thresholds match.
            </>
          }
          right={
            <>Minimal primitives, strong defaults, and predictable outcomes. Weekly by design.</>
          }
        />
        <FeatureGridSection />

        <EditorialTextSection
          eyebrow="Signals → payouts"
          body={
            <>
              Triggers are transparent and auditable. When the week is active and a zone crosses
              thresholds, payouts happen automatically. No manual claims processing.
            </>
          }
          right={<>Weather, AQI, restrictions, traffic. Only external disruptions.</>}
        />
        <MiddleSection />

        <PrinciplesSection />

        <CoverageBoundariesSection />

        <FinalCTASection />
        <FAQSection />
      </main>
      <Footer />
    </LandingShell>
  );
}
