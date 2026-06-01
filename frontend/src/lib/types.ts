/** Shared domain types used across multiple pages. */

export type EventItem = {
  id: number;
  title: string;
  description?: string | null;
  start_time: string;
  end_time: string;
  location?: string | null;
  type: string;
  facebook_link?: string | null;
  instagram_link?: string | null;
  recurrence?: string | null;
  recurrence_end_date?: string | null;
  recurrence_series_id?: number | null;
  is_cancelled?: boolean;
};

export type MemberItem = {
  id: number;
  username: string;
  name: string;
  phone?: string | null;
  birth_date?: string | null;
  address?: string | null;
  join_year?: number | null;
  system_role: string;
  musical_role?: string | null;
};

export type ReinforcementItem = {
  id: number;
  name: string;
  instrument: string | null;
  contact: string | null;
  usual_fee: number | null;
};

export type EventReinforcementItem = {
  id: number;
  event_id: number;
  reinforcement_id: number;
  fee: number | null;
  reinforcement: ReinforcementItem;
};

/** Store user shape as returned from the login/me endpoints. */
export type StoredUser = {
  id?: number;
  username?: string;
  name?: string;
  system_role?: string;
  musical_role?: string | null;
};

export type BirthdayItem = {
  id: number;
  name: string;
  birth_date?: string | null;
  days_until?: number | null;
};

export type FeedItem = {
  id: number;
  item_type: 'EVENT' | 'NEWSLETTER';
  title: string;
  description?: string | null;
  published_at: string;
  event_type?: string | null;
  facebook_link?: string | null;
  instagram_link?: string | null;
};
