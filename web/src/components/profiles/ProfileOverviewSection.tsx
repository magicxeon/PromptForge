import { ArrowRight } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function ProfileOverviewSection({
  title,
  viewAllHref,
  viewAllLabel,
  children,
  className = ''
}: {
  title: string;
  viewAllHref?: string | null;
  viewAllLabel: string;
  children: ReactNode;
  className?: string;
}) {
  const headingId = useId();
  return (
    <section
      className={`profile-overview-section ${className}`.trim()}
      aria-labelledby={headingId}
    >
      <header className="profile-overview-section__header">
        <h2 id={headingId}>{title}</h2>
        {viewAllHref ? (
          <Link to={viewAllHref}>
            {viewAllLabel}<ArrowRight aria-hidden="true" />
          </Link>
        ) : null}
      </header>
      <div className="profile-overview-section__body">{children}</div>
    </section>
  );
}
