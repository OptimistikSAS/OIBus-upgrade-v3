import { BaseEntity, Language, Timezone } from './types';

export interface User extends BaseEntity {
  login: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  language: Language;
  timezone: Timezone;
}

export interface UserSearchParam {
  login?: string;
  page?: number;
}
