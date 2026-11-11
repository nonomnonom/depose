import { SetMetadata } from '@nestjs/common';

export const ALLOW_NON_MEMBER_KEY = 'allowNonMember';

/**
 * Lets an authenticated user without a membership on the current tenant reach a
 * handler, e.g. accepting an invitation to that firm.
 */
export const AllowNonMember = () => SetMetadata(ALLOW_NON_MEMBER_KEY, true);
