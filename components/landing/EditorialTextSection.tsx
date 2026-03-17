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
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/35">
              {eyebrow}
            </p>
          ) : null}
          {title ? (
            <h2 className="mt-3 text-[clamp(24px,2.2vw,32px)] font-semibold tracking-[-0.04em] text-white">
              {title}
            </h2>
          ) : null}
          <div className="mt-3 text-[15px] sm:text-[16px] leading-[1.65] text-white/55 max-w-[70ch]">
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

