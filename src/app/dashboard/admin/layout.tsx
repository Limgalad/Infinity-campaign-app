"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const adminNavItems = [
  {
    label: "Overview",
    href: "/dashboard/admin",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="square" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
        <path strokeLinecap="square" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
      </svg>
    ),
  },
  {
    label: "Campaigns",
    href: "/dashboard/admin/campaigns",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="square" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
      </svg>
    ),
  },
  {
    label: "Players",
    href: "/dashboard/admin/players",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="square" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: "Strike Teams",
    href: "/dashboard/admin/strike-teams",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="square" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    label: "Matchmaking",
    href: "/dashboard/admin/matchmaking",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="square" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div>
      {/* Admin header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 bg-red" />
          <div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-base sm:text-xl tracking-[0.15em] text-text-primary">
              ADMIN PANEL
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-xs sm:text-sm text-text-secondary tracking-wider mt-0.5">
              CAMPAIGN MANAGEMENT
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          className="self-start sm:self-auto px-4 py-2 border border-border text-text-secondary hover:text-cyan hover:border-cyan-dim font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Admin navigation tabs */}
      <div className="flex gap-1 mb-8 border-b border-border pb-px overflow-x-auto">
        {adminNavItems.map((item) => {
          const isActive =
            item.href === "/dashboard/admin"
              ? pathname === "/dashboard/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 sm:px-4 py-3 font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase transition-all whitespace-nowrap border-b-2 -mb-px ${
                isActive
                  ? "text-cyan border-cyan bg-cyan/5"
                  : "text-text-secondary border-transparent hover:text-text-primary hover:border-border"
              }`}
            >
              <span className={isActive ? "text-cyan" : "text-text-muted"}>
                {item.icon}
              </span>
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Admin content */}
      {children}
    </div>
  );
}
