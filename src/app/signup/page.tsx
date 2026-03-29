"use client";

import { useState } from "react";
import Link from "next/link";
import { signup } from "@/app/auth/actions";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signup(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-void bg-grid relative flex items-center justify-center overflow-hidden">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber/20 to-transparent" />

      <div className="relative w-full max-w-md mx-4" style={{ animation: "slide-up 0.6s ease-out" }}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-2 h-2 bg-amber status-dot" />
            <span className="data-label font-[family-name:var(--font-mono)] tracking-[0.3em] text-amber-dim">
              NEW OPERATOR REGISTRATION
            </span>
          </div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-3xl font-bold tracking-wide text-text-primary text-glow">
            ENLIST
          </h1>
          <p className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.2em] text-text-secondary mt-1">
            JOIN THE CAMPAIGN
          </p>
        </div>

        <div className="panel panel-glow p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <div className="w-1 h-6 bg-amber" />
            <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] text-text-secondary uppercase">
              Operator Registration
            </h2>
          </div>

          <form action={handleSubmit} className="space-y-5">
            <div>
              <label className="data-label block mb-2 font-[family-name:var(--font-mono)]">
                Callsign
              </label>
              <input
                type="text"
                name="displayName"
                required
                className="w-full font-[family-name:var(--font-mono)] text-sm"
                placeholder="Your operator name"
              />
            </div>

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
                minLength={6}
                className="w-full font-[family-name:var(--font-mono)] text-sm"
                placeholder="Min. 6 characters"
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
              className="w-full py-3 bg-amber/10 border border-amber-dim text-amber font-[family-name:var(--font-orbitron)] text-sm tracking-[0.15em] uppercase
                hover:bg-amber/20 hover:border-amber transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                active:scale-[0.98]"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <span className="w-3 h-3 border border-amber border-t-transparent rounded-full animate-spin" />
                  REGISTERING
                </span>
              ) : (
                "REGISTER OPERATOR"
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <span className="text-text-muted text-sm">Already registered? </span>
            <Link
              href="/login"
              className="text-cyan-dim hover:text-cyan text-sm font-[family-name:var(--font-mono)] transition-colors"
            >
              Authenticate
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
