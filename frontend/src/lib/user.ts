/**
 * Helpers for reading the locally-stored authenticated user.
 * The user object is written to localStorage by the login flow and
 * is read here without parsing the JWT directly.
 */

import type { StoredUser } from './types';

const USER_KEY = 'airfa_user';

/** Returns the stored user object, or null if not logged in. */
export function getStoredUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function isAdmin(user: StoredUser | null): boolean {
  return user?.system_role === 'ADMIN' || user?.system_role === 'SUPER_ADMIN';
}

export function isSuperAdmin(user: StoredUser | null): boolean {
  return user?.system_role === 'SUPER_ADMIN';
}
