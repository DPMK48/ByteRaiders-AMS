import type { UserRole } from "../components/AuthProvider";

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  position: string;
  status: "present" | "absent";
  __ts?: number;
}

export interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  status: "present" | "absent";
  __ts?: number;
}

export interface AttendanceRecord {
  id: string;
  userId?: string | null;
  userName: string;
  userRole: UserRole;
  email: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  status: "present" | "absent";
  __ts?: number;
}

export interface NewStaffForm {
  name: string;
  email: string;
  position: string;
  password: string;
}

export interface NewStudentForm {
  name: string;
  email: string;
  department: string;
  password: string;
}

export interface EditStaffForm {
  name: string;
  email: string;
  position: string;
}

export interface EditStudentForm {
  name: string;
  email: string;
  department: string;
}

export interface DeleteTarget {
  id: string;
  name: string;
  type: "staff" | "student";
}
