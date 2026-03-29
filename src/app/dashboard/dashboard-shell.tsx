"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { ToastProvider } from "@/components/toast";

const navItems = [
  {
    label: "Command Center",
    href: "/dashboard",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="square" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: "Campaigns",
    href: "/dashboard/campaigns",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="square" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
      </svg>
    ),
  },
];

export function DashboardShell({
  children,
  playerName,
  isAdmin,
}: {
  children: React.ReactNode;
  playerName: string;
  isAdmin: boolean;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const allNavItems = isAdmin
    ? [
        ...navItems,
        {
          label: "Admin Panel",
          href: "/dashboard/admin",
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="square" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
              <path strokeLinecap="square" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        },
      ]
    : navItems;

  return (
    <ToastProvider>
    <div className="h-screen bg-void flex overflow-hidden">
      {/* Mobile header bar */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-abyss border-b border-border flex items-center justify-between px-4 py-3 md:hidden">
        <Link href="/dashboard" className="block">
          <h1 className="font-[family-name:var(--font-orbitron)] text-sm font-bold tracking-[0.2em] text-text-primary">
            INFINITY
          </h1>
        </Link>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-10 h-10 flex items-center justify-center border border-border text-text-secondary hover:text-cyan hover:border-cyan-dim transition-colors cursor-pointer"
          aria-label="Toggle menu"
        >
          {sidebarOpen ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="square" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="square" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-void/80 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-64 bg-abyss border-r border-border flex flex-col shrink-0
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:relative md:z-auto md:h-full
        `}
      >
        {/* Logo */}
        <div className="p-5 border-b border-border">
          <Link href="/dashboard" className="block" onClick={() => setSidebarOpen(false)}>
            <h1 className="font-[family-name:var(--font-orbitron)] text-sm font-bold tracking-[0.2em] text-text-primary">
              INFINITY
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.3em] text-cyan-dim mt-0.5">
              CAMPAIGN TRACKER
            </p>
          </Link>
        </div>

        {/* Operator info */}
        <div className="px-5 py-4 border-b border-border">
          <div className="data-label font-[family-name:var(--font-mono)] mb-1">OPERATOR</div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green rounded-full shrink-0" />
            <span className="font-[family-name:var(--font-mono)] text-sm text-text-primary truncate">
              {playerName}
            </span>
          </div>
          {isAdmin && (
            <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-red/10 border border-red-dim/30 text-red font-[family-name:var(--font-mono)] text-[10px] tracking-wider uppercase">
              Admin
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="data-label font-[family-name:var(--font-mono)] px-5 mb-3">NAVIGATION</div>
          {allNavItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-5 py-3 transition-all duration-150 group cursor-pointer ${
                  isActive
                    ? item.href === "/dashboard/admin"
                      ? "text-red bg-red/5"
                      : "text-cyan bg-surface/50"
                    : "text-text-secondary hover:text-cyan hover:bg-surface/50"
                }`}
              >
                <span
                  className={`transition-colors ${
                    isActive
                      ? item.href === "/dashboard/admin"
                        ? "text-red"
                        : "text-cyan"
                      : "text-text-muted group-hover:text-cyan"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-sm tracking-wider uppercase">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* System status & logout */}
        <div className="px-5 py-4 border-t border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 bg-cyan status-dot" />
            <span className="font-[family-name:var(--font-mono)] text-xs tracking-wider text-text-secondary uppercase">
              System Online
            </span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 text-text-muted hover:text-red hover:bg-red-dim/10 border border-border hover:border-red-dim/40 transition-all duration-150 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="square" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              <span className="font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase">
                Log Out
              </span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-grid">
        <div className="p-4 pt-16 md:p-8 md:pt-8">
          {children}
        </div>
      </main>
    </div>
    </ToastProvider>
  );
}
