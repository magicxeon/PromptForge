import type { ReactNode } from 'react';
import { AdminNavigation } from './AdminNavigation';

type AdminWorkspaceLayoutProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function AdminWorkspaceLayout({ eyebrow, title, description, children }: AdminWorkspaceLayoutProps) {
  return <main>
    <header className="mb-5 border-b border-[var(--mpf-border)] pb-5">
      <span className="text-xs font-bold uppercase text-cyan-300">{eyebrow}</span>
      <h1 className="mb-0 mt-2 text-3xl">{title}</h1>
      {description ? <p className="mb-0 mt-2 max-w-3xl text-sm text-[var(--mpf-text-muted)]">{description}</p> : null}
    </header>
    <AdminNavigation />
    {children}
  </main>;
}
