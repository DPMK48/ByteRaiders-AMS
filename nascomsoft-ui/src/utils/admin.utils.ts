import type { AttendanceRecord } from "../types/admin.types";

export const getLagosDateKey = (d = new Date()) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

export const recordDateKey = (dateStr?: string | Date | null) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString("en-CA", {
        timeZone: "Africa/Lagos",
      })
    : null;

export const sortOverview = (arr: AttendanceRecord[]) =>
  arr.sort((a, b) => (b.__ts ?? 0) - (a.__ts ?? 0));

export const formatTimeString = (date: string | null | undefined): string => {
  if (!date || isNaN(new Date(date).getTime())) {
    return "—";
  }
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatDateString = (date: string | null | undefined): string => {
  if (!date || isNaN(new Date(date).getTime())) {
    return "—";
  }
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const calculateAttendanceRate = (
  staff: { status: string }[],
  students: { status: string }[]
): number => {
  const totalPeople = staff.length + students.length;
  if (totalPeople === 0) return 0;
  const presentCount =
    staff.filter((s) => s.status === "present").length +
    students.filter((s) => s.status === "present").length;
  return Math.round((presentCount / totalPeople) * 100);
};
