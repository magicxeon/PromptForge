import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, Coins, Settings, ShieldCheck, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AccountPreferencesDialog } from './AccountPreferencesDialog';

type AccountMenuProps = {
  actorId?: string;
  displayName: string;
  initials: string;
  profilePath: string | undefined;
  creditsPath?: string;
  adminPath?: string;
  menuLabel: string;
  viewProfileLabel: string;
  unavailableLabel: string;
  creditsLabel?: string;
  settingsLabel?: string;
  adminLabel?: string;
};

export function AccountMenu({
  actorId,
  displayName,
  initials,
  profilePath,
  creditsPath = '/credits',
  adminPath,
  menuLabel,
  viewProfileLabel,
  unavailableLabel,
  creditsLabel = 'Credits',
  settingsLabel = 'Settings',
  adminLabel = 'Admin'
}: AccountMenuProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => setSettingsOpen(false), [actorId]);
  return (
    <><DropdownMenu.Root>
      <DropdownMenu.Trigger
        type="button"
        className="global-header__profile-trigger"
        aria-label={menuLabel}
        title={menuLabel}
      >
        <span className="global-header__avatar" aria-hidden="true">
          {initials || <UserRound />}
        </span>
        <ChevronDown className="global-header__profile-chevron" aria-hidden="true" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="global-header__profile-menu"
          align="end"
          sideOffset={8}
        >
          <DropdownMenu.Label className="global-header__profile-menu-label">
            {displayName}
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="global-header__profile-menu-separator" />
          {profilePath ? (
            <DropdownMenu.Item asChild>
              <Link className="global-header__profile-menu-item" to={profilePath}>
                <UserRound aria-hidden="true" />
                <span>{viewProfileLabel}</span>
              </Link>
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item
              className="global-header__profile-menu-item is-disabled"
              disabled
            >
              <UserRound aria-hidden="true" />
              <span>{unavailableLabel}</span>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item asChild>
            <Link className="global-header__profile-menu-item" to={creditsPath}>
              <Coins aria-hidden="true" />
              <span>{creditsLabel}</span>
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={`global-header__profile-menu-item${actorId ? '' : ' is-disabled'}`} disabled={!actorId} onSelect={() => setSettingsOpen(true)}>
            <Settings aria-hidden="true" />
            <span>{settingsLabel}</span>
          </DropdownMenu.Item>
          {adminPath ? (
            <DropdownMenu.Item asChild>
              <Link className="global-header__profile-menu-item" to={adminPath}>
                <ShieldCheck aria-hidden="true" />
                <span>{adminLabel}</span>
              </Link>
            </DropdownMenu.Item>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
    {settingsOpen && actorId ? <AccountPreferencesDialog key={actorId} actorId={actorId} onClose={() => setSettingsOpen(false)} /> : null}</>
  );
}
