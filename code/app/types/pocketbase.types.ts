// types/pocketbase.types.ts
import type { RecordModel } from "pocketbase";

export interface UserRecord extends RecordModel {
  email: string;
  name?: string;
  avatar?: string;
}

export interface NotificationRecord extends RecordModel {
  user: string;
  title: string;
  message?: string;
  is_read: boolean;
  link?: string;
  type?: string;
}

export interface TripRecord extends RecordModel {
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget?: number | null;
  currency: string;
  is_archived: boolean;
  thumbnail?: string;
  created_by: string;
}

export type MemberRole = "admin" | "member" | "viewer";

export interface TripMemberRecord extends RecordModel {
  trip: string;
  user?: string | null;
  display_name: string;
  role: MemberRole;
  expand?: {
    user?: UserRecord;
  };
}

export interface ExpenseSplitRecord extends RecordModel {
  expense: string;
  member: string;
  amount: number;
}

export interface SplitPayload {
  member_id: string;
  amount: number;
}

export interface ExpenseRecord extends RecordModel {
  trip: string;
  title: string;
  amount: number;
  category?: string;
  date: string;
  paid_by?: string | null;
  paid_from_pot?: boolean;
  is_income?: boolean;
  receipt?: string | null;
  notes?: string | null;
  expand?: {
    paid_by?: TripMemberRecord;
    category?: RecordModel;
    expense_splits_via_expense?: ExpenseSplitRecord[];
  };
}

export interface TripCategoryRecord extends RecordModel {
  trip: string;
  name: string;
  icon?: string;
  color?: string;
}

export type InviteRole = "admin" | "member" | "viewer";
export type InviteStatus = "pending" | "accepted" | "rejected";

export interface TripInviteRecord extends RecordModel {
  trip: string;
  email: string;
  role: InviteRole;
  status: InviteStatus;
}

export interface PendingInvite extends TripInviteRecord {
  expand?: {
    trip?: TripRecord;
  };
}

export interface TripInviteRecord extends RecordModel {
  trip: string;
  email: string;
  role: MemberRole;
  status: InviteStatus;
  expand?: {
    trip?: TripRecord;
  };
}
