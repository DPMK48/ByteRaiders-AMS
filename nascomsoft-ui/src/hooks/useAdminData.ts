import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import type {
  StaffMember,
  Student,
  AttendanceRecord,
} from "../types/admin.types";
import { getLagosDateKey, recordDateKey, sortOverview } from "../utils/admin.utils";

interface UseAdminDataReturn {
  staff: StaffMember[];
  students: Student[];
  attendanceOverview: AttendanceRecord[];
  setStaff: React.Dispatch<React.SetStateAction<StaffMember[]>>;
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  setAttendanceOverview: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
  refreshData: () => Promise<void>;
}

export const useAdminData = (): UseAdminDataReturn => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceOverview, setAttendanceOverview] = useState<AttendanceRecord[]>([]);

  const syncStatuses = (overview: AttendanceRecord[]) => {
    const todayKey = getLagosDateKey();
    const presentByEmail = new Map<string, "present">();
    const presentByUserId = new Map<string, "present">();

    overview.forEach((r) => {
      const recKey = recordDateKey(r.date);
      if (recKey === todayKey && r.checkIn) {
        if (r.email) presentByEmail.set(String(r.email).toLowerCase(), "present");
        if (r.userId) presentByUserId.set(String(r.userId), "present");
      }
    });

    setStaff((prev) =>
      prev.map((s) => {
        const byEmail = presentByEmail.get(String(s.email).toLowerCase());
        const byId = presentByUserId.get(String(s.id));
        return { ...s, status: byEmail ?? byId ?? "absent" };
      })
    );

    setStudents((prev) =>
      prev.map((s) => {
        const byEmail = presentByEmail.get(String(s.email).toLowerCase());
        const byId = presentByUserId.get(String(s.id));
        return { ...s, status: byEmail ?? byId ?? "absent" };
      })
    );
  };

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("nascomsoft-token");
      if (!token) throw new Error("No auth token found");

      const date = getLagosDateKey();
      const [staffRes, studentsRes, overviewRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/auth/staff`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/auth/student`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(
          `${import.meta.env.VITE_API_URL}/attendance/overview?date=${date}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        ),
      ]);

      if (![staffRes, studentsRes, overviewRes].every((r) => r.ok)) {
        throw new Error("One or more requests failed");
      }

      const [staffData, studentsData, overviewData] = await Promise.all([
        staffRes.json(),
        studentsRes.json(),
        overviewRes.json(),
      ]);

      const rawOverview: any[] = Array.isArray(overviewData)
        ? overviewData
        : overviewData?.data ?? overviewData?.attendance ?? [];

      const formattedOverview: AttendanceRecord[] = rawOverview
        .map((r: any) => {
          const checkIn = r.checkIn ?? r.checkInTime ?? r.inTime ?? null;
          const checkOut = r.checkOut ?? r.checkOutTime ?? r.outTime ?? null;
          const dateVal = r.date ?? r.attendanceDate ?? r.createdAt ?? null;

          const timestamp = checkIn
            ? new Date(checkIn).getTime()
            : dateVal
            ? new Date(dateVal).getTime()
            : Date.now();

          return {
            id: r._id ?? r.id ?? `${r.email ?? "unknown"}-${timestamp}`,
            userId: r.userId ?? r.user?._id ?? r.user?.id ?? null,
            userName:
              r.name ??
              r.user?.name ??
              r.userName ??
              `${r.firstName ?? ""} ${r.lastName ?? ""}`.trim(),
            userRole: r.role ?? r.user?.role ?? r.userRole,
            email: (r.email ?? r.user?.email ?? "").toLowerCase(),
            date: dateVal,
            checkIn,
            checkOut,
            status: r.status ?? (checkIn ? "present" : "absent"),
            __ts: timestamp,
          } as AttendanceRecord;
        })
        .sort((a, b) => (b.__ts ?? 0) - (a.__ts ?? 0));

      const formattedStaff: StaffMember[] = Array.isArray(staffData)
        ? staffData.map((s: any) => ({
            id: s._id,
            name: s.name,
            email: (s.email ?? "").toLowerCase(),
            position: s.position ?? "",
            status: "absent" as const,
            __ts:
              s.__ts ?? s.createdAt
                ? new Date(s.createdAt).getTime()
                : Date.now(),
          })).sort((a, b) => (b.__ts ?? 0) - (a.__ts ?? 0))
        : [];
      const formattedStudents: Student[] = Array.isArray(studentsData)
        ? studentsData.map((s: any) => ({
            id: s._id,
            name: s.name,
            email: (s.email ?? "").toLowerCase(),
            department: s.department ?? "",
            status: "absent" as const,
            __ts:
              s.__ts ?? s.createdAt
                ? new Date(s.createdAt).getTime()
                : Date.now(),
          })).sort((a, b) => (b.__ts ?? 0) - (a.__ts ?? 0))
        : [];

      setStaff(formattedStaff);
      setStudents(formattedStudents);
      setAttendanceOverview(formattedOverview);

      syncStatuses(formattedOverview);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load staff, students, or overview");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    staff,
    students,
    attendanceOverview,
    setStaff,
    setStudents,
    setAttendanceOverview,
    refreshData: fetchData,
  };
};

export const useSocketConnection = (
  setAttendanceOverview: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>,
  setStaff: React.Dispatch<React.SetStateAction<StaffMember[]>>,
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>
) => {
  useEffect(() => {
    const token = localStorage.getItem("nascomsoft-token");
    if (!token) return;

    const socketBase = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    try {
      const socket: Socket = io(socketBase, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: { token },
      });

      socket.on("connect", () => {
        console.log("Admin socket connected ->", socketBase);
      });

      socket.on("attendanceUpdated", (payload: any) => {
        const checkIn = payload.checkIn ?? payload.checkInTime ?? payload.inTime ?? null;
        const checkOut = payload.checkOut ?? payload.checkOutTime ?? payload.outTime ?? null;
        const dateVal = payload.date ?? payload.attendanceDate ?? payload.createdAt ?? null;
        const timestamp = checkIn
          ? new Date(checkIn).getTime()
          : dateVal
          ? new Date(dateVal).getTime()
          : Date.now();

        const incoming: AttendanceRecord = {
          id:
            payload._id ??
            payload.id ??
            `${payload.email ?? "unknown"}-${timestamp}`,
          userId: payload.userId ?? payload.user?._id ?? payload.user?.id ?? null,
          userName:
            payload.name ??
            payload.user?.name ??
            payload.userName ??
            `${payload.firstName ?? ""} ${payload.lastName ?? ""}`.trim(),
          userRole: payload.role ?? payload.user?.role ?? payload.userRole,
          email: (payload.email ?? payload.user?.email ?? "").toLowerCase(),
          date: dateVal,
          checkIn,
          checkOut,
          status: payload.status ?? (checkIn ? "present" : "absent"),
          __ts: timestamp,
        };

        setAttendanceOverview((prev) => {
          const incomingDateKey = recordDateKey(incoming.date);
          const findMatchIndex = prev.findIndex((r) => {
            const rDateKey = recordDateKey(r.date);
            if (incoming.userId && r.userId) {
              return (
                String(r.userId) === String(incoming.userId) &&
                rDateKey === incomingDateKey
              );
            }
            return (
              r.email &&
              incoming.email &&
              String(r.email).toLowerCase() ===
                String(incoming.email).toLowerCase() &&
              rDateKey === incomingDateKey
            );
          });

          let updated;
          if (findMatchIndex >= 0) {
            updated = [...prev];
            updated[findMatchIndex] = {
              ...updated[findMatchIndex],
              ...incoming,
            };
          } else {
            updated = [incoming, ...prev];
          }

          sortOverview(updated);
          
          // Sync statuses
          const todayKey = getLagosDateKey();
          const presentByEmail = new Map<string, "present">();
          const presentByUserId = new Map<string, "present">();

          updated.forEach((r) => {
            const recKey = recordDateKey(r.date);
            if (recKey === todayKey && r.checkIn) {
              if (r.email) presentByEmail.set(String(r.email).toLowerCase(), "present");
              if (r.userId) presentByUserId.set(String(r.userId), "present");
            }
          });

          setStaff((prev) =>
            prev.map((s) => {
              const byEmail = presentByEmail.get(String(s.email).toLowerCase());
              const byId = presentByUserId.get(String(s.id));
              return { ...s, status: byEmail ?? byId ?? "absent" };
            })
          );

          setStudents((prev) =>
            prev.map((s) => {
              const byEmail = presentByEmail.get(String(s.email).toLowerCase());
              const byId = presentByUserId.get(String(s.id));
              return { ...s, status: byEmail ?? byId ?? "absent" };
            })
          );

          return updated;
        });
      });

      socket.on("disconnect", () => {
        console.log("Admin socket disconnected");
      });

      socket.on("connect_error", (err: any) => {
        console.warn("Socket connect_error:", err.message || err);
      });

      return () => {
        socket.disconnect();
      };
    } catch (err) {
      console.warn("Socket init failed:", err);
    }
  }, [setAttendanceOverview, setStaff, setStudents]);
};
