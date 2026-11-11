import { FirmDomainsList } from './FirmSettingsDomains';
import { FirmSettingsResourcePage } from './FirmSettingsResource';

export function FirmSettingsPage() {
  return (
    <>
      <FirmSettingsResourcePage />
      <FirmDomainsList firmId="current" />
    </>
  );
}
