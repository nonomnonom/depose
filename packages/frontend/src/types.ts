import type {
  FirmDomainDto,
  FirmDto,
  MatterDto,
  MatterListDto,
  MeFirmDto,
  MeResponseDto,
  OnboardingStatusDto,
  TenantResponseDto,
} from '~/generated/schemas';

export type Matter = MatterDto;
export type MatterStatus = MatterDto['status'];
export type MatterPage = MatterListDto;
export type Firm = FirmDto | MeFirmDto;
export type FirmDomain = FirmDomainDto;
export type Me = MeResponseDto;
export type OnboardingStatus = OnboardingStatusDto;
export type TenantInfo = TenantResponseDto;
