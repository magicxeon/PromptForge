import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { ChevronDown, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';

type AccountMenuProps = {
  displayName: string;
  initials: string;
  profilePath: string | undefined;
  menuLabel: string;
  viewProfileLabel: string;
  unavailableLabel: string;
};

export function AccountMenu({
  displayName,
  initials,
  profilePath,
  menuLabel,
  viewProfileLabel,
  unavailableLabel
}: AccountMenuProps) {
  return (
    <DropdownMenu.Root>
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
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
