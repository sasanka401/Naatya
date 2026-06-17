export type MemberStatus = 'Free' | 'Busy' | 'On Leave';
export type PropStatus = 'Available' | 'In Use' | 'Damaged';
export type UserRole = 'Director' | 'Cast';
export type AttendanceStatus = 'Attending' | 'Not Attending' | 'Maybe';
export type NoteEntity = 'member' | 'prop' | 'rehearsal';

export interface Production {
  id: string;
  name: string;
  created_at?: string;
}

export interface Member {
  id: string;
  name: string;
  role: string;
  phone: string;
  status: MemberStatus;
  production_id?: string | null;
  stage_name?: string | null;
  address?: string | null;
  created_at?: string;
}

export interface Prop {
  id: string;
  name: string;
  quantity: number;
  status: PropStatus;
  act_scene?: string | null;
  production_id?: string | null;
  created_at?: string;
}

export interface Rehearsal {
  id: string;
  title: string;
  rehearsal_date: string;
  rehearsal_time: string;
  venue: string;
  production_id?: string | null;
  created_at?: string;
}

export type ApprovalStatus = 'pending_onboarding' | 'pending_admin' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  detailed_role: string | null;
  approval_status: ApprovalStatus;
  portfolio_link: string | null;
  portfolio_path: string | null;
  is_admin: boolean;
  member_id: string | null;
  created_at?: string;
}

export interface Script {
  id: string;
  title: string;
  description: string | null;
  storage_path: string;
  uploaded_by: string | null;
  production_id?: string | null;
  created_at?: string;
  version?: number;
  profiles?: {
    email: string;
  } | null;
}

export interface ActivityLogEntry {
  id: string;
  message: string;
  created_at: string;
}

export interface Character {
  id: string;
  production_id: string | null;
  name: string;
  description: string | null;
  member_id: string | null;
  created_at?: string;
}

export interface Attendance {
  id: string;
  rehearsal_id: string;
  profile_id: string;
  status: AttendanceStatus;
  created_at?: string;
}

export interface Note {
  id: string;
  entity_type: NoteEntity;
  entity_id: string;
  body: string;
  author_email: string | null;
  created_at: string;
}

export interface InviteCode {
  id: string;
  code: string;
  role: UserRole;
  used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at?: string;
}
