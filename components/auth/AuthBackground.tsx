export function AuthBackground() {
  return (
    <div
      className="fixed inset-0 flex items-start pt-[12%] justify-center overflow-hidden pointer-events-none z-0 md:items-center md:pt-0"
      aria-hidden
    >
      <span
        className="font-black tracking-[-0.04em] select-none whitespace-nowrap bg-gradient-to-b from-emerald-500/10 to-zinc-600/5 bg-clip-text text-transparent text-[3.5rem] sm:text-[5rem] md:text-[clamp(6rem,22vw,16rem)]"
        style={{ lineHeight: 0.9 }}
      >
        OASIS
      </span>
    </div>
  );
}
