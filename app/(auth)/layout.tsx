import { AuthBackground } from "@/components/auth/AuthBackground";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen bg-[#0a0a0a] bg-gradient-to-b from-zinc-950 to-zinc-900">
      <AuthBackground />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
