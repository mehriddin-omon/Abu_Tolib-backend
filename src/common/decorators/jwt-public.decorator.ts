import { SetMetadata } from '@nestjs/common';

export const PUBLIC_KEY = '$ecret';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
