import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Route does not require an authenticated session (spec 31). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
