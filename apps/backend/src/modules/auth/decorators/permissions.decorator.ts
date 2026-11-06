import { SetMetadata } from '@nestjs/common';

export const SCREENS_KEY = 'allowed_screens';
export const RequireScreen = (...screens: string[]) =>
  SetMetadata(SCREENS_KEY, screens);
