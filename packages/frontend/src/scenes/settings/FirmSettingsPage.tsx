import { FirmDomainsList } from '~/scenes/settings/FirmSettingsDomains';
import { FirmSettingsResourcePage } from '~/scenes/settings/FirmSettingsResource';

export function FirmSettingsPage() {
  return (
    <>
      <FirmSettingsResourcePage />
      <FirmDomainsList firmId="current" />
    </>
  );
}
