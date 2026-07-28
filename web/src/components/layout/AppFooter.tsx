import { SiteFooter } from './SiteFooter';
import { SystemStatusFooter } from './SystemStatusFooter';

export function AppFooter() {
  return (
    <div className="app-footer">
      <SystemStatusFooter />
      <SiteFooter />
    </div>
  );
}
