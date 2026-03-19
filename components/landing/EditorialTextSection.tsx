import { ReactNode } from 'react';

export function EditorialTextSection({
  eyebrow,
  title,
  body,
  right,
}: {
  eyebrow?: string;
  title?: string;
  body: ReactNode;
  right?: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2 className="mt-3 text-[clamp(28px,2.2vw,36px)] font-bold tracking-[-0.04em] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 leading-tight">
              {title}
            </h2>
          ) : null}
          <div className="mt-4 text-[16px] sm:text-[18px] leading-[1.65] text-white/50 max-w-[70ch] tracking-tight">
            {body}
          </div>
        </div>
        {right ? (
          <div className="hidden lg:flex justify-end text-right text-[12px] leading-relaxed text-white/35">
            <div className="max-w-[36ch]">{right}</div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

