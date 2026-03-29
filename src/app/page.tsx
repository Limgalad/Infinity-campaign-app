import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-void bg-grid relative flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient effects */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan/30 to-transparent" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan/3 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-amber/3 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative text-center" style={{ animation: "slide-up 0.8s ease-out" }}>
        {/* Classification badge */}
        <div className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 border border-border bg-surface/50">
          <div className="w-1.5 h-1.5 bg-cyan status-dot" />
          <span className="data-label font-[family-name:var(--font-mono)] tracking-[0.4em] text-cyan-dim text-[10px]">
            OPERATIONAL COMMAND SYSTEM // NC78
          </span>
        </div>

        {/* Title */}
        <h1 className="font-[family-name:var(--font-orbitron)] text-6xl md:text-7xl font-black tracking-wider text-text-primary mb-2">
          <span className="text-glow">INFINITY</span>
        </h1>
        <div className="flex items-center justify-center gap-4 mb-2">
          <div className="w-16 h-px bg-gradient-to-r from-transparent to-cyan/50" />
          <p className="font-[family-name:var(--font-orbitron)] text-lg tracking-[0.35em] text-cyan-dim">
            CAMPAIGN TRACKER
          </p>
          <div className="w-16 h-px bg-gradient-to-l from-transparent to-cyan/50" />
        </div>
        <p className="font-[family-name:var(--font-mono)] text-sm text-text-muted tracking-wider mt-4 mb-12">
          RED LANDS &mdash; PLANET SHINJU &mdash; NARRATIVE CAMPAIGN
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="group relative px-8 py-3 bg-cyan/10 border border-cyan-dim text-cyan font-[family-name:var(--font-orbitron)] text-sm tracking-[0.2em] uppercase
              hover:bg-cyan/20 hover:border-cyan hover:text-glow transition-all duration-300"
          >
            <span className="relative z-10">AUTHENTICATE</span>
          </Link>
          <Link
            href="/signup"
            className="px-8 py-3 border border-border text-text-secondary font-[family-name:var(--font-orbitron)] text-sm tracking-[0.2em] uppercase
              hover:border-text-muted hover:text-text-primary transition-all duration-300"
          >
            ENLIST
          </Link>
        </div>

        {/* Stats preview */}
        <div className="mt-16 flex items-center justify-center gap-8 text-center">
          {[
            { label: "CHAPTERS", value: "6" },
            { label: "MAX XP", value: "78" },
            { label: "DURATION", value: "9 MO" },
          ].map((stat) => (
            <div key={stat.label} className="px-4">
              <div className="font-[family-name:var(--font-mono)] text-2xl font-bold text-text-primary">
                {stat.value}
              </div>
              <div className="data-label font-[family-name:var(--font-mono)] mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan/20 to-transparent" />
    </div>
  );
}
