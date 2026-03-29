"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/app/auth/actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-void bg-grid relative flex items-center justify-center overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan/20 to-transparent" />

      <div className="relative w-full max-w-md mx-4" style={{ animation: "slide-up 0.6s ease-out" }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-cyan status-dot" />
            <span className="data-label font-[family-name:var(--font-mono)] tracking-[0.3em] text-cyan-dim">
              SHINJU DEPLOYMENT // NC78
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-3xl font-bold tracking-wide text-text-primary text-glow">
            INFINITY
          </h1>
          <p className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.2em] text-text-secondary mt-1">
            CAMPAIGN TRACKER
          </p>
        </div>

        {/* Login panel */}
        <div className="panel panel-glow p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="w-1 h-6 bg-cyan" />
            <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-secondary uppercase">
              Operator Authentication
            </h2>
          </div>

          <form action={handleSubmit} className="space-y-5">
            <div>
              <label className="data-label block mb-2 font-[family-name:var(--font-mono)]">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full font-[family-name:var(--font-mono)] text-sm"
                placeholder="operator@command.mil"
              />
            </div>

            <div>
              <label className="data-label block mb-2 font-[family-name:var(--font-mono)]">
                Access Code
              </label>
              <input
                type="password"
                name="password"
                required
                className="w-full font-[family-name:var(--font-mono)] text-sm"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2 bg-red-dim/20 border border-red-dim/40 text-red text-sm font-[family-name:var(--font-mono)]">
                <span className="text-red">!</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-cyan/10 border border-cyan-dim text-cyan font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] uppercase
                hover:bg-cyan/20 hover:border-cyan hover:text-glow transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-[0.98]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 border border-cyan border-t-transparent rounded-full animate-spin" />
                  AUTHENTICATING
                </span>
              ) : (
                "AUTHENTICATE"
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <span className="text-text-muted text-sm">New operator? </span>
            <Link
              href="/signup"
              className="text-cyan-dim hover:text-cyan text-sm font-[family-name:var(--font-mono)] transition-colors"
            >
              Request Access
            </Link>
          </div>
        </div>

        {/* Footer classification */}
        <div className="mt-6 text-center">
          <span className="data-label font-[family-name:var(--font-mono)] text-text-muted/50">
            CLASSIFICATION: OPERATIONAL // RED LANDS CAMPAIGN
          </span>
        </div>
      </div>
    </div>
  );
}
