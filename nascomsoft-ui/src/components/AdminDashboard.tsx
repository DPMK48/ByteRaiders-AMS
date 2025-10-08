import { useState, useEffect, useMemo } from "react";
import { io } from "socket.io-client";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import {
  Users,
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Download,
  LogOut,
  BarChart3,
  Calendar,
  Search,
  Filter,
  TrendingUp,
  FileText,
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

import { useAuth } from "./AuthProvider";
import type { UserRole } from "./AuthProvider";
import { ThemeToggle } from "./ThemeToggle";
import { toast } from "sonner";

interface StaffMember {
  id: string;
  name: string;
  email: string;
  position: string;
  status: "present" | "absent";
  __ts?: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  status: "present" | "absent";
  __ts?: number;
}

interface AttendanceRecord {
  id: string;
  userId?: string | null;
  userName: string;
  userRole: UserRole;
  email: string;
  date: string; // normalized string (YYYY-MM-DD or ISO)
  checkIn?: string | null; // server usually returns ISO timestamp strings
  checkOut?: string | null;
  status: "present" | "absent";
  __ts?: number; // internal timestamp for sorting
}

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);

  // Delete confirmation dialog states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    type: "staff" | "student";
  } | null>(null);

  // Separate search states for each section
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [staffSearchTerm, setStaffSearchTerm] = useState("");
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState("");
  const [attendanceDateFrom, setAttendanceDateFrom] = useState("");
  const [attendanceDateTo, setAttendanceDateTo] = useState("");

  const [filterRole, setFilterRole] = useState<"all" | UserRole>("all");
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [attendanceOverview, setAttendanceOverview] = useState<
    AttendanceRecord[]
  >([]);

  // Password visibility states
  const [showNewStudentPassword, setShowNewStudentPassword] = useState(false);
  const [showNewStaffPassword, setShowNewStaffPassword] = useState(false);

  // Form states
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    position: "",
    password: "",
  });
  const [newStudent, setNewStudent] = useState({
    name: "",
    email: "",
    department: "",
    password: "",
  });
  const [editStaffForm, setEditStaffForm] = useState({
    name: "",
    email: "",
    position: "",
  });
  const [editStudentForm, setEditStudentForm] = useState({
    name: "",
    email: "",
    department: "",
  });

  //
  // Sync statuses helper (match by email first, fallback to userId)
  //
  const syncStatuses = (overview: AttendanceRecord[]) => {
    const todayKey = getLagosDateKey();
    const presentByEmail = new Map<string, "present">();
    const presentByUserId = new Map<string, "present">();

    overview.forEach((r) => {
      const recKey = recordDateKey(r.date);
      if (recKey === todayKey && r.checkIn) {
        if (r.email)
          presentByEmail.set(String(r.email).toLowerCase(), "present");
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

  //
  // Fetch initial data
  //
  useEffect(() => {
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
          // ask server for today's overview if supported
          fetch(
            `${import.meta.env.VITE_API_URL}/attendance/overview?date=${date}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          ),
        ]);

        if (![staffRes, studentsRes, overviewRes].every((r) => r.ok)) {
          console.error("Responses:", { staffRes, studentsRes, overviewRes });
          throw new Error("One or more requests failed");
        }

        const [staffData, studentsData, overviewData] = await Promise.all([
          staffRes.json(),
          studentsRes.json(),
          overviewRes.json(),
        ]);

        console.log("raw overviewData:", overviewData);

        const rawOverview: any[] = Array.isArray(overviewData)
          ? overviewData
          : overviewData?.data ?? overviewData?.attendance ?? [];

        // Map and normalize, include timestamp for sorting, include email (lowercased)
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
          .sort((a, b) => (b.__ts ?? 0) - (a.__ts ?? 0)); // newest-first

        const formattedStaff: StaffMember[] = Array.isArray(staffData)
          ? staffData.map((s: any) => ({
            id: s._id,
            name: s.name,
            email: (s.email ?? "").toLowerCase(),
            position: s.position ?? "",
            status: "absent",
            __ts:
              s.__ts ?? s.createdAt
                ? new Date(s.createdAt).getTime()
                : Date.now(), // Add this
          }))
          : [];
        const formattedStudents: Student[] = Array.isArray(studentsData)
          ? studentsData.map((s: any) => ({
            id: s._id,
            name: s.name,
            email: (s.email ?? "").toLowerCase(),
            department: s.department ?? "",
            status: "absent",
            __ts:
              s.__ts ?? s.createdAt
                ? new Date(s.createdAt).getTime()
                : Date.now(), // Add this
          }))
          : [];

        setStaff(formattedStaff);
        setStudents(formattedStudents);
        setAttendanceOverview(formattedOverview);

        // Sync statuses for KPIs and lists (email-aware)
        syncStatuses(formattedOverview);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load staff, students, or overview");
      }
    };

    fetchData();
  }, []);

  //
  // Socket: listen for attendance updates (requires server to emit 'attendanceUpdated')
  //
  useEffect(() => {
    const token = localStorage.getItem("nascomsoft-token");
    if (!token) return;

    console.log("VITE_SOCKET_URL =", import.meta.env.VITE_SOCKET_URL);

    const socketBase =
      import.meta.env.VITE_SOCKET_URL || window.location.origin;

    try {
      const socket = io(socketBase, {
        path: "/socket.io",
        transports: ["websocket", "polling"],
        auth: { token },
      });
      // socketRef.current = socket;

      socket.on("connect", () => {
        console.log("Admin socket connected ->", socketBase);
      });

      socket.on("attendanceUpdated", (payload: any) => {
        // Normalize payload (make email lowercase)
        const checkIn =
          payload.checkIn ?? payload.checkInTime ?? payload.inTime ?? null;
        const checkOut =
          payload.checkOut ?? payload.checkOutTime ?? payload.outTime ?? null;
        const dateVal =
          payload.date ?? payload.attendanceDate ?? payload.createdAt ?? null;
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
          userId:
            payload.userId ?? payload.user?._id ?? payload.user?.id ?? null,
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
          // Merge: prefer matching by userId+date, else email+date.
          const incomingDateKey = recordDateKey(incoming.date);
          const findMatchIndex = prev.findIndex((r) => {
            const rDateKey = recordDateKey(r.date);
            // if both have userId, match by that
            if (incoming.userId && r.userId) {
              return (
                String(r.userId) === String(incoming.userId) &&
                rDateKey === incomingDateKey
              );
            }
            // else match by email
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
          // sync statuses after updating overview
          syncStatuses(updated);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //
  // Helpers (Lagos date normalization)
  //
  const getLagosDateKey = (d = new Date()) =>
    new Date(d).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

  const recordDateKey = (dateStr?: string | Date | null) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-CA", {
        timeZone: "Africa/Lagos",
      })
      : null;

  const sortOverview = (arr: AttendanceRecord[]) =>
    arr.sort((a, b) => (b.__ts ?? 0) - (a.__ts ?? 0));

  //
  // Counts & derived values (use Lagos-normalized keys)
  //
  const todayKey = getLagosDateKey();
  const todayCheckIns = attendanceOverview.filter(
    (r) => recordDateKey(r.date) === todayKey && r.checkIn
  ).length;
  const totalRecords = attendanceOverview.length;

  //
  // Delete confirmation handlers
  //
  const handleDeleteClick = (
    id: string,
    name: string,
    type: "staff" | "student"
  ) => {
    setDeleteTarget({ id, name, type });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem("nascomsoft-token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/users/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Delete failed");

      if (deleteTarget.type === "staff") {
        setStaff((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        toast.success("Staff member deleted successfully");
      } else {
        setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
        toast.success("Student deleted successfully");
      }
    } catch (error) {
      toast.error(`Failed to delete ${deleteTarget.type}`);
      console.error(error);
    } finally {
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  };

  //
  // Add / Edit operations
  //
  const addStaff = async () => {
    if (
      !newStaff.name ||
      !newStaff.email ||
      !newStaff.position ||
      !newStaff.password
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("nascomsoft-token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/register/staff`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newStaff),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add staff");

      const staffMember: StaffMember = {
        id: data.user._id,
        name: data.user.name,
        email: (data.user.email ?? "").toLowerCase(),
        position: data.user.position ?? "",
        status: "absent",
        __ts: Date.now(), // Add this line
      };

      setStaff((prev) => [staffMember, ...prev]);
      setNewStaff({ name: "", email: "", position: "", password: "" });
      setIsAddStaffOpen(false);
      toast.success("Staff member added successfully!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add staff");
    }
  };

  const addStudent = async () => {
    if (
      !newStudent.name ||
      !newStudent.email ||
      !newStudent.department ||
      !newStudent.password
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const token = localStorage.getItem("nascomsoft-token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/register/student`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newStudent),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add student");

      const student: Student = {
        id: data.user._id,
        name: data.user.name,
        email: (data.user.email ?? "").toLowerCase(),
        department: data.user.department ?? "",
        status: "absent",
        __ts: Date.now(), // Add this line
      };

      setStudents((prev) => [student, ...prev]);
      setNewStudent({ name: "", email: "", department: "", password: "" });
      setIsAddStudentOpen(false);
      toast.success("Student added successfully!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add student");
    }
  };

  const editStaff = (staffMember: StaffMember) => {
    setEditingStaff(staffMember);
    setEditStaffForm({
      name: staffMember.name,
      email: staffMember.email,
      position: staffMember.position,
    });
    setIsEditStaffOpen(true);
  };

  const editStudent = (student: Student) => {
    setEditingStudent(student);
    setEditStudentForm({
      name: student.name,
      email: student.email,
      department: student.department,
    });
    setIsEditStudentOpen(true);
  };

  const updateStaff = async () => {
    if (
      !editingStaff ||
      !editStaffForm.name ||
      !editStaffForm.email ||
      !editStaffForm.position
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("nascomsoft-token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/users/${editingStaff.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editStaffForm),
        }
      );

      if (!res.ok) throw new Error("Failed to update staff");
      const updatedRes = await res.json();
      const updatedUser = updatedRes.user ?? updatedRes;

      const updatedStaff = staff.map((s) =>
        s.id === editingStaff.id ? { ...s, ...updatedUser } : s
      );
      setStaff(updatedStaff);
      setIsEditStaffOpen(false);
      setEditingStaff(null);
      toast.success("Staff member updated successfully");
    } catch (error) {
      toast.error("Failed to update staff");
      console.error(error);
    }
  };

  const updateStudent = async () => {
    if (
      !editingStudent ||
      !editStudentForm.name ||
      !editStudentForm.email ||
      !editStudentForm.department
    ) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const token = localStorage.getItem("nascomsoft-token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/auth/users/${editingStudent.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editStudentForm),
        }
      );

      if (!res.ok) throw new Error("Failed to update student");
      const updatedRes = await res.json();
      const updatedUser = updatedRes.user ?? updatedRes;

      const updatedStudents = students.map((s) =>
        s.id === editingStudent.id ? { ...s, ...updatedUser } : s
      );
      setStudents(updatedStudents);
      setIsEditStudentOpen(false);
      setEditingStudent(null);
      toast.success("Student updated successfully");
    } catch (error) {
      toast.error("Failed to update student");
      console.error(error);
    }
  };

  //
  // Export (CSV) - uses filtered attendance data
  //
  const exportAttendance = () => {
    const dataToExport =
      filteredAttendance.length > 0 ? filteredAttendance : attendanceOverview;

    const csvContent = [
      ["Name", "Role", "Email", "Date", "Check-in", "Check-out", "Status"],
      ...dataToExport.map((record) => [
        record.userName,
        record.userRole,
        record.email,
        record.date,
        record.checkIn ? new Date(record.checkIn).toLocaleTimeString() : "",
        record.checkOut ? new Date(record.checkOut).toLocaleTimeString() : "",
        record.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    let filename = `attendance-${new Date().toISOString().split("T")[0]}`;
    if (
      attendanceSearchTerm ||
      attendanceDateFrom ||
      attendanceDateTo ||
      filterRole !== "all"
    ) {
      filename += "-filtered";
    }
    filename += ".csv";

    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Quick date range setters
  const setDateRange = (months: number) => {
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setMonth(today.getMonth() - months);

    setAttendanceDateFrom(fromDate.toISOString().split("T")[0]);
    setAttendanceDateTo(today.toISOString().split("T")[0]);
  };

  const clearDateRange = () => {
    setAttendanceDateFrom("");
    setAttendanceDateTo("");
  };

  //
  // Filtering / search with separate search terms for each section
  //
  const filteredStudents = useMemo(() => {
    return students
      .filter((student) => {
        const matchesSearch =
          student.name
            ?.toLowerCase()
            .includes(studentSearchTerm.toLowerCase()) ||
          student.email
            ?.toLowerCase()
            .includes(studentSearchTerm.toLowerCase()) ||
          student.department
            ?.toLowerCase()
            .includes(studentSearchTerm.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => (b.__ts ?? 0) - (a.__ts ?? 0));
  }, [students, studentSearchTerm]);

  const filteredStaff = useMemo(() => {
    return staff
      .filter((member) => {
        const matchesSearch =
          member.name?.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
          member.email?.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
          member.position
            ?.toLowerCase()
            .includes(staffSearchTerm.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => (b.__ts ?? 0) - (a.__ts ?? 0));
  }, [staff, staffSearchTerm]);

  const filteredAttendance = useMemo(() => {
    return attendanceOverview.filter((record) => {
      const matchesSearch =
        record.userName
          ?.toLowerCase()
          .includes(attendanceSearchTerm.toLowerCase()) ||
        record.email
          ?.toLowerCase()
          .includes(attendanceSearchTerm.toLowerCase());

      const matchesRole =
        filterRole === "all" || record.userRole === filterRole;

      let matchesDateRange = true;
      if (attendanceDateFrom || attendanceDateTo) {
        const recordDate = recordDateKey(record.date);
        if (recordDate) {
          const recordDateObj = new Date(recordDate);

          if (attendanceDateFrom) {
            const fromDate = new Date(attendanceDateFrom);
            matchesDateRange = matchesDateRange && recordDateObj >= fromDate;
          }

          if (attendanceDateTo) {
            const toDate = new Date(attendanceDateTo);
            toDate.setHours(23, 59, 59, 999);
            matchesDateRange = matchesDateRange && recordDateObj <= toDate;
          }
        }
      }

      return matchesSearch && matchesRole && matchesDateRange;
    });
  }, [
    attendanceOverview,
    attendanceSearchTerm,
    filterRole,
    attendanceDateFrom,
    attendanceDateTo,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Premium Header */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-sm border-b border-gray-200/60 dark:border-gray-700/50 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="relative group">
                  <div className="absolute inset-0  rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative rounded-2xl group-hover:scale-105 transition-transform duration-300">
                    <img src="/logo.png" alt="" className="w-14"/>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-700 dark:from-gray-100 dark:via-gray-200 dark:to-gray-300 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Welcome back,{" "}
                    <span className="font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {user?.name}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="flex items-center space-x-2 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 rounded-xl"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Premium KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Students Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white border-0 shadow-2xl hover:shadow-blue-500/30 transition-all duration-500 hover:scale-[1.02] group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-125 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8 group-hover:scale-110 transition-transform duration-700"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-blue-50 tracking-wide uppercase">
                Total Students
              </CardTitle>
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-bold mb-2 tracking-tight">{students.length}</div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-50/90 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {students.filter((s) => s.status === "present").length} present today
                </p>
                <ArrowUpRight className="h-4 w-4 text-white/70" />
              </div>
            </CardContent>
          </Card>

          {/* Total Staff Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white border-0 shadow-2xl hover:shadow-emerald-500/30 transition-all duration-500 hover:scale-[1.02] group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-125 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8 group-hover:scale-110 transition-transform duration-700"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-emerald-50 tracking-wide uppercase">
                Total Staff
              </CardTitle>
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-bold mb-2 tracking-tight">{staff.length}</div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-emerald-50/90 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {staff.filter((s) => s.status === "present").length} present today
                </p>
                <ArrowUpRight className="h-4 w-4 text-white/70" />
              </div>
            </CardContent>
          </Card>

          {/* Today's Check-ins Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500 via-purple-600 to-violet-600 text-white border-0 shadow-2xl hover:shadow-purple-500/30 transition-all duration-500 hover:scale-[1.02] group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-125 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8 group-hover:scale-110 transition-transform duration-700"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-purple-50 tracking-wide uppercase">
                Today's Check-ins
              </CardTitle>
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-bold mb-2 tracking-tight">{todayCheckIns}</div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-purple-50/90 flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  {totalRecords} total records
                </p>
                <ArrowUpRight className="h-4 w-4 text-white/70" />
              </div>
            </CardContent>
          </Card>

          {/* Attendance Rate Card */}
          <Card className="relative overflow-hidden bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 text-white border-0 shadow-2xl hover:shadow-orange-500/30 transition-all duration-500 hover:scale-[1.02] group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 group-hover:scale-125 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-8 -translate-x-8 group-hover:scale-110 transition-transform duration-700"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
              <CardTitle className="text-sm font-semibold text-orange-50 tracking-wide uppercase">
                Attendance Rate
              </CardTitle>
              <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-4xl font-bold mb-2 tracking-tight">
                {students.length + staff.length > 0
                  ? Math.round(
                      (todayCheckIns / (students.length + staff.length)) * 100
                    )
                  : 0}
                %
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-orange-50/90 flex items-center gap-1.5">
                  <Activity className="h-4 w-4" />
                  Overall today
                </p>
                <ArrowUpRight className="h-4 w-4 text-white/70" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Premium Management Tabs */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <Tabs defaultValue="attendance" className="space-y-6 p-6 sm:p-8">
            <TabsList className="grid w-full grid-cols-3 p-1.5 bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/60 shadow-inner">
              <TabsTrigger
                value="attendance"
                className="rounded-xl font-semibold text-gray-600 dark:text-gray-400 data-[state=active]:bg-gradient-to-br data-[state=active]:from-white data-[state=active]:to-gray-50 dark:data-[state=active]:from-gray-700 dark:data-[state=active]:to-gray-800 data-[state=active]:shadow-lg data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 transition-all duration-300 hover:scale-[1.02]"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Attendance</span>
              </TabsTrigger>
              <TabsTrigger
                value="students"
                className="rounded-xl font-semibold text-gray-600 dark:text-gray-400 data-[state=active]:bg-gradient-to-br data-[state=active]:from-white data-[state=active]:to-gray-50 dark:data-[state=active]:from-gray-700 dark:data-[state=active]:to-gray-800 data-[state=active]:shadow-lg data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 transition-all duration-300 hover:scale-[1.02]"
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Students</span>
              </TabsTrigger>
              <TabsTrigger
                value="staff"
                className="rounded-xl font-semibold text-gray-600 dark:text-gray-400 data-[state=active]:bg-gradient-to-br data-[state=active]:from-white data-[state=active]:to-gray-50 dark:data-[state=active]:from-gray-700 dark:data-[state=active]:to-gray-800 data-[state=active]:shadow-lg data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 transition-all duration-300 hover:scale-[1.02]"
              >
                <Users className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Staff</span>
              </TabsTrigger>
              
            </TabsList>

            {/* Attendance Overview */}
            <TabsContent value="attendance" className="space-y-6 animate-in fade-in-50 duration-500">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                    Attendance Overview
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    Track and monitor attendance records
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={exportAttendance}
                    variant="outline"
                    className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 hover:bg-white dark:text-gray-300 dark:hover:bg-slate-700 hover:shadow-lg hover:scale-105 transition-all duration-300 rounded-xl"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export{" "}
                    {filteredAttendance.length > 0 &&
                      (attendanceSearchTerm ||
                        attendanceDateFrom ||
                        attendanceDateTo ||
                        filterRole !== "all")
                      ? `Filtered (${filteredAttendance.length})`
                      : "All"}{" "}
                    CSV
                  </Button>
                </div>
              </div>

              {/* Premium Attendance Search and Filters */}
              <div className="space-y-4 bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-slate-800/90 dark:to-slate-900/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-gray-200/60 dark:border-gray-700/60 shadow-xl">
                {/* Name/Email Search and Role Filter */}
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                  <div className="flex-1 relative group">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-200" />
                    <Input
                      placeholder="Search by name or email..."
                      value={attendanceSearchTerm}
                      onChange={(e) => setAttendanceSearchTerm(e.target.value)}
                      className="pl-12 pr-4 py-6 max-w-2xl text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 focus:border-purple-400 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-200/50 dark:focus:ring-purple-500/30 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                    />
                  </div>
                  <div className="flex gap-3 items-center">
                    <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl">
                      <Filter className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">Filter</span>
                    </div>
                    <Select
                      value={filterRole}
                      onValueChange={(value: any) => setFilterRole(value)}
                    >
                      <SelectTrigger className="w-44 text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all" className="text-gray-700 dark:text-gray-300">
                          All Roles
                        </SelectItem>
                        <SelectItem value="staff" className="text-gray-700 dark:text-gray-300">
                          Staff Only
                        </SelectItem>
                        <SelectItem value="student" className="text-gray-700 dark:text-gray-300">
                          Students Only
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Enhanced Date Search */}
                <div className="space-y-3">
                  <div className="flex gap-3 items-center">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Search by Date:
                    </Label>
                    <Input
                      type="date"
                      placeholder="Select specific date"
                      value={
                        attendanceDateFrom === attendanceDateTo
                          ? attendanceDateFrom
                          : ""
                      }
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        setAttendanceDateFrom(selectedDate);
                        setAttendanceDateTo(selectedDate);
                      }}
                      className="w-44 text-gray-600 font-semibold bg-white/80 backdrop-blur-sm border-gray-200/50 dark:text-gray-800"
                    />
                  </div>

                  {/* Custom Date Range */}
                  <div className="ml-7 flex flex-wrap items-center gap-3">
                    <Label className="text-sm text-gray-600 dark:text-gray-300">
                      Or select custom range:
                    </Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="date"
                        placeholder="From date"
                        value={attendanceDateFrom}
                        onChange={(e) => setAttendanceDateFrom(e.target.value)}
                        className="w-44 text-gray-600 font-semibold bg-white/80 backdrop-blur-sm border-gray-200/50 dark:text-gray-800"
                      />
                      <span className="text-sm text-gray-500 dark:text-gray-300">to</span>
                      <Input
                        type="date"
                        placeholder="To date"
                        value={attendanceDateTo}
                        onChange={(e) => setAttendanceDateTo(e.target.value)}
                        className="w-44 text-gray-600 font-semibold bg-white/80 backdrop-blur-sm border-gray-200/50 dark:text-gray-800"
                      />
                    </div>

                    {/* Quick Date Range Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateRange(1)}
                        className="text-xs bg-white/60 hover:bg-white border-gray-200/50"
                      >
                        Last Month
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateRange(3)}
                        className="text-xs bg-white/60 hover:bg-white border-gray-200/50"
                      >
                        Last 3 Months
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateRange(6)}
                        className="text-xs bg-white/60 hover:bg-white border-gray-200/50"
                      >
                        Last 6 Months
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateRange(12)}
                        className="text-xs bg-white/60 hover:bg-white border-gray-200/50"
                      >
                        Last Year
                      </Button>
                      {(attendanceDateFrom || attendanceDateTo) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearDateRange}
                          className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Clear Range
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 backdrop-blur-xl z-10 border-b border-gray-200/70 dark:border-gray-700/70 shadow-sm">
                      <TableRow className="border-gray-200/70 dark:border-gray-700/70 hover:bg-transparent">
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Name
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Role
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Email
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Date
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Check-in
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Check-out
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Status
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttendance.map((record, idx) => (
                        <TableRow
                          key={record.id}
                          className="border-gray-200/40 dark:border-gray-700/40 hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-violet-50/30 dark:hover:from-purple-900/20 dark:hover:to-violet-900/10 transition-all duration-200"
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                            <div className="flex items-center gap-2">
                              <div className={`h-8 w-8 rounded-full ${
                                record.userRole === "staff"
                                  ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                                  : "bg-gradient-to-br from-blue-500 to-indigo-500"
                              } flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                                {record.userName.charAt(0).toUpperCase()}
                              </div>
                              {record.userName}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`capitalize font-semibold shadow-sm ${
                                record.userRole === "staff"
                                  ? "border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                  : "border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              }`}
                            >
                              {record.userRole}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {record.email}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400 font-medium">
                            {record.date
                              ? new Date(record.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {record.checkIn ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-300 text-xs font-bold rounded-lg shadow-sm border border-green-200 dark:border-green-700">
                                <Activity className="h-3 w-3" />
                                {new Date(record.checkIn).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  }
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {record.checkOut ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-800 dark:text-orange-300 text-xs font-bold rounded-lg shadow-sm border border-orange-200 dark:border-orange-700">
                                <Activity className="h-3 w-3" />
                                {new Date(record.checkOut).toLocaleTimeString(
                                  "en-US",
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    hour12: true,
                                  }
                                )}
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.status === "present"
                                  ? "default"
                                  : "destructive"
                              }
                              className={`${
                                record.status === "present"
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                                  : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700"
                              } font-semibold px-3 py-1 shadow-sm`}
                            >
                              {record.status === "present" ? (
                                <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1 inline" />
                              )}
                              {record.status.charAt(0).toUpperCase() +
                                record.status.slice(1)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredAttendance.length === 0 && (
                    <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 mb-6">
                        <FileText className="h-10 w-10 text-purple-500 dark:text-purple-400" />
                      </div>
                      <p className="text-xl font-bold mb-2 text-gray-700 dark:text-gray-300">
                        No attendance records found
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        {attendanceSearchTerm ||
                          attendanceDateFrom ||
                          attendanceDateTo ||
                          filterRole !== "all"
                          ? "Try adjusting your search criteria or date range to find records."
                          : "Attendance records will appear here once users check in."}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Students Management */}
            <TabsContent value="students" className="space-y-6 animate-in fade-in-50 duration-500">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                    Student Management
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Manage student accounts and information
                  </p>
                </div>
                <Dialog
                  open={isAddStudentOpen}
                  onOpenChange={setIsAddStudentOpen}
                >
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-700 hover:via-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 rounded-xl">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-gray-800">
                        Add New Student
                      </DialogTitle>
                      <DialogDescription className="text-sm text-gray-600">
                        Enter the student details below.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="student-name"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Name
                        </Label>
                        <Input
                          id="student-name"
                          value={newStudent.name}
                          onChange={(e) =>
                            setNewStudent({
                              ...newStudent,
                              name: e.target.value,
                            })
                          }
                          placeholder="Student name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="student-email"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Email
                        </Label>
                        <Input
                          id="student-email"
                          type="email"
                          value={newStudent.email}
                          onChange={(e) =>
                            setNewStudent({
                              ...newStudent,
                              email: e.target.value,
                            })
                          }
                          placeholder="student@nascomsoft.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="student-department"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Department
                        </Label>
                        <Input
                          id="student-department"
                          value={newStudent.department}
                          onChange={(e) =>
                            setNewStudent({
                              ...newStudent,
                              department: e.target.value,
                            })
                          }
                          placeholder="Computer Science"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="student-password"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Password
                        </Label>
                        <div className="relative mt-1">
                          <Input
                            id="student-password"
                            type={showNewStudentPassword ? "text" : "password"}
                            value={newStudent.password}
                            onChange={(e) =>
                              setNewStudent({
                                ...newStudent,
                                password: e.target.value,
                              })
                            }
                            placeholder="Default password"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewStudentPassword(!showNewStudentPassword)}
                          >
                            {showNewStudentPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddStudentOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={addStudent}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                      >
                        Add Student
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Premium Student Search */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                <Input
                  placeholder="Search students by name, email, or department..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-6 max-w-2xl text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-200/50 dark:focus:ring-blue-500/30 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                />
              </div>

              <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 backdrop-blur-xl z-10 border-b border-gray-200/70 dark:border-gray-700/70 shadow-sm">
                      <TableRow className="border-gray-200/70 dark:border-gray-700/70 hover:bg-transparent">
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Name
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Email
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Department
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Status
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student, idx) => (
                        <TableRow
                          key={student.id}
                          className="border-gray-200/40 dark:border-gray-700/40 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/30 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/10 transition-all duration-200 group"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              {student.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {student.email}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700 font-medium">
                              {student.department}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                student.status === "present"
                                  ? "default"
                                  : "secondary"
                              }
                              className={`${
                                student.status === "present"
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                              } font-semibold px-3 py-1 shadow-sm`}
                            >
                              {student.status === "present" ? (
                                <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1 inline" />
                              )}
                              {student.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <div className="flex gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => editStudent(student)}
                                      className="h-9 w-9 p-0 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 rounded-xl hover:scale-110"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0">
                                    <p className="font-medium">Edit Student</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleDeleteClick(
                                          student.id,
                                          student.name,
                                          "student"
                                        )
                                      }
                                      className="h-9 w-9 p-0 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 rounded-xl hover:scale-110"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gradient-to-r from-red-600 to-rose-600 text-white border-0">
                                    <p className="font-medium">Delete Student</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredStudents.length === 0 && (
                    <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 mb-6">
                        <GraduationCap className="h-10 w-10 text-blue-500 dark:text-blue-400" />
                      </div>
                      <p className="text-xl font-bold mb-2 text-gray-700 dark:text-gray-300">
                        No students found
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {studentSearchTerm
                          ? "Try adjusting your search criteria."
                          : "Add your first student to get started."}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Staff Management */}
            <TabsContent value="staff" className="space-y-6 animate-in fade-in-50 duration-500">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                    Staff Management
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-500" />
                    Manage staff accounts and information
                  </p>
                </div>
                <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:via-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-emerald-500/50 transition-all duration-300 hover:scale-105 rounded-xl">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Staff
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-gray-800">
                        Add New Staff Member
                      </DialogTitle>
                      <DialogDescription className="text-sm text-gray-600">
                        Enter the staff member details below.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label
                          htmlFor="staff-name"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Name
                        </Label>
                        <Input
                          id="staff-name"
                          value={newStaff.name}
                          onChange={(e) =>
                            setNewStaff({ ...newStaff, name: e.target.value })
                          }
                          placeholder="Staff name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="staff-email"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Email
                        </Label>
                        <Input
                          id="staff-email"
                          type="email"
                          value={newStaff.email}
                          onChange={(e) =>
                            setNewStaff({ ...newStaff, email: e.target.value })
                          }
                          placeholder="staff@nascomsoft.com"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="staff-position"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Position
                        </Label>
                        <Input
                          id="staff-position"
                          value={newStaff.position || ""}
                          onChange={(e) =>
                            setNewStaff({
                              ...newStaff,
                              position: e.target.value,
                            })
                          }
                          placeholder="Senior Developer"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="staff-password"
                          className="text-sm font-semibold text-gray-700"
                        >
                          Password
                        </Label>
                        <div className="relative mt-1">
                          <Input
                            id="staff-password"
                            type={showNewStaffPassword ? "text" : "password"}
                            value={newStaff.password}
                            onChange={(e) =>
                              setNewStaff({
                                ...newStaff,
                                password: e.target.value,
                              })
                            }
                            placeholder="Default password"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewStaffPassword(!showNewStaffPassword)}
                          >
                            {showNewStaffPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <DialogFooter className="pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddStaffOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={addStaff}
                        className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
                      >
                        Add Staff
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Premium Staff Search */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
                <Input
                  placeholder="Search staff by name, email, or position..."
                  value={staffSearchTerm}
                  onChange={(e) => setStaffSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-6 max-w-2xl text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 focus:border-emerald-400 dark:focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200/50 dark:focus:ring-emerald-500/30 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
                />
              </div>

              <Card className="shadow-2xl border-0 rounded-2xl overflow-hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
                <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="sticky top-0 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 backdrop-blur-xl z-10 border-b border-gray-200/70 dark:border-gray-700/70 shadow-sm">
                      <TableRow className="border-gray-200/70 dark:border-gray-700/70 hover:bg-transparent">
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Name
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Email
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Position
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Status
                        </TableHead>
                        <TableHead className="font-bold text-gray-800 dark:text-gray-200 tracking-wide uppercase text-xs">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map((member, idx) => (
                        <TableRow
                          key={member.id}
                          className="border-gray-200/40 dark:border-gray-700/40 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/30 dark:hover:from-emerald-900/20 dark:hover:to-teal-900/10 transition-all duration-200 group"
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <TableCell className="font-semibold text-gray-900 dark:text-gray-100">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm font-bold shadow-md">
                                {member.name.charAt(0).toUpperCase()}
                              </div>
                              {member.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {member.email}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 font-medium">
                              {member.position || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                member.status === "present"
                                  ? "default"
                                  : "secondary"
                              }
                              className={`${
                                member.status === "present"
                                  ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700"
                                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                              } font-semibold px-3 py-1 shadow-sm`}
                            >
                              {member.status === "present" ? (
                                <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-1 inline" />
                              )}
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <div className="flex gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => editStaff(member)}
                                      className="h-9 w-9 p-0 text-gray-700 dark:text-gray-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all duration-200 rounded-xl hover:scale-110"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0">
                                    <p className="font-medium">Edit Staff Member</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleDeleteClick(
                                          member.id,
                                          member.name,
                                          "staff"
                                        )
                                      }
                                      className="h-9 w-9 p-0 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 rounded-xl hover:scale-110"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-gradient-to-r from-red-600 to-rose-600 text-white border-0">
                                    <p className="font-medium">Delete Staff Member</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredStaff.length === 0 && (
                    <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mb-6">
                        <Users className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
                      </div>
                      <p className="text-xl font-bold mb-2 text-gray-700 dark:text-gray-300">
                        No staff members found
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {staffSearchTerm
                          ? "Try adjusting your search criteria."
                          : "Add your first staff member to get started."}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            
          </Tabs>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
        >
          <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-bold text-red-600">
                Delete{" "}
                {deleteTarget?.type === "staff" ? "Staff Member" : "Student"}?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm text-gray-600">
                You are about to permanently delete{" "}
                <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>.
                This action cannot be undone and will remove all associated
                data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={handleDeleteCancel}
                className="border-gray-300"
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500 text-white"
              >
                Delete{" "}
                {deleteTarget?.type === "staff" ? "Staff Member" : "Student"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Student Dialog */}
        <Dialog open={isEditStudentOpen} onOpenChange={setIsEditStudentOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">
                Edit Student
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Update the student details below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="edit-student-name"
                  className="text-sm font-semibold text-gray-700"
                >
                  Name
                </Label>
                <Input
                  id="edit-student-name"
                  value={editStudentForm.name}
                  onChange={(e) =>
                    setEditStudentForm({
                      ...editStudentForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="Student name"
                  className="mt-1 border-gray-300"
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-student-email"
                  className="text-sm font-semibold text-gray-700"
                >
                  Email
                </Label>
                <Input
                  id="edit-student-email"
                  type="email"
                  value={editStudentForm.email}
                  onChange={(e) =>
                    setEditStudentForm({
                      ...editStudentForm,
                      email: e.target.value,
                    })
                  }
                  placeholder="student@nascomsoft.com"
                  className="mt-1 border-gray-300"
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-student-department"
                  className="text-sm font-semibold text-gray-700"
                >
                  Department
                </Label>
                <Input
                  id="edit-student-department"
                  value={editStudentForm.department}
                  onChange={(e) =>
                    setEditStudentForm({
                      ...editStudentForm,
                      department: e.target.value,
                    })
                  }
                  placeholder="Computer Science"
                  className="mt-1 border-gray-300"
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditStudentOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={updateStudent}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={isEditStaffOpen} onOpenChange={setIsEditStaffOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-800">
                Edit Staff Member
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Update the staff member details below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label
                  htmlFor="edit-staff-name"
                  className="text-sm font-semibold text-gray-700"
                >
                  Name
                </Label>
                <Input
                  id="edit-staff-name"
                  value={editStaffForm.name}
                  onChange={(e) =>
                    setEditStaffForm({ ...editStaffForm, name: e.target.value })
                  }
                  placeholder="Staff name"
                  className="mt-1 border-gray-300"
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-staff-email"
                  className="text-sm font-semibold text-gray-700"
                >
                  Email
                </Label>
                <Input
                  id="edit-staff-email"
                  type="email"
                  value={editStaffForm.email}
                  onChange={(e) =>
                    setEditStaffForm({
                      ...editStaffForm,
                      email: e.target.value,
                    })
                  }
                  placeholder="staff@nascomsoft.com"
                  className="mt-1 border-gray-300"
                />
              </div>
              <div>
                <Label
                  htmlFor="edit-staff-position"
                  className="text-sm font-semibold text-gray-700"
                >
                  Position
                </Label>
                <Input
                  id="edit-staff-position"
                  value={editStaffForm.position}
                  onChange={(e) =>
                    setEditStaffForm({
                      ...editStaffForm,
                      position: e.target.value,
                    })
                  }
                  placeholder="Senior Developer"
                  className="mt-1 border-gray-300"
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                onClick={() => setIsEditStaffOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={updateStaff}
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
