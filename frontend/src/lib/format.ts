/** Shared date/time and label formatters used across pages. */

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** Human-readable label for event type codes. */
export const EVENT_LABELS: Record<string, string> = {
  REHEARSAL: 'Ensaio',
  SPECIAL_REHEARSAL: 'Ensaio especial',
  CONCERT: 'Concerto',
  OTHER: 'Outro',
};

/** CSS class name for event type badges. */
export const EVENT_BADGE: Record<string, string> = {
  REHEARSAL: 'badge-rehearsal',
  SPECIAL_REHEARSAL: 'badge-special',
  CONCERT: 'badge-concert',
  OTHER: 'badge-other',
};

/** Human-readable label for musical role codes. */
export const MUSICAL_ROLE_LABEL: Record<string, string> = {
  MAESTRO: 'Maestro',
  FLUTE_PLAYER: 'Flauta',
  CLARINET_PLAYER: 'Clarinete',
  SAXOPHONE_PLAYER: 'Saxofone',
  TROMBONE_PLAYER: 'Trombone',
  EUPHONIUM_PLAYER: 'Eufônio',
  TUBA_PLAYER: 'Tuba',
  FRENCH_HORN_PLAYER: 'Trompa',
  TRUMPET_PLAYER: 'Trompete',
  PERCUSSION_PLAYER: 'Percussão',
};

/** Human-readable label for system role codes. */
export const SYSTEM_ROLE_LABEL: Record<string, string> = {
  MEMBER: 'Membro',
  REGULAR: 'Membro',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
};

/** CSS badge class for system roles. */
export const SYSTEM_BADGE: Record<string, string> = {
  MEMBER: 'badge-musical',
  REGULAR: 'badge-musical',
  ADMIN: 'badge-admin',
  SUPER_ADMIN: 'badge-super',
};

export function formatDay(iso: string): number {
  return new Date(iso).getDate();
}

export function formatMonth(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', { month: 'short' }).toUpperCase();
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDays(days: number | null | undefined): string {
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Amanhã';
  return `Em ${days} dias`;
}
