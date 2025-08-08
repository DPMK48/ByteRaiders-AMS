import { useState, useEffect, useMemo, useRef } from "react";
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
  UserCheck,
  Clock,
  TrendingUp,
  Settings,
  FileText,
  Shield,
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
  __ts?: number; // Add timestamp for sorting
}

interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  status: "present" | "absent";
  __ts?: number; // Add timestamp for sorting
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
    type: 'staff' | 'student';
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
          fetch(`${import.meta.env.VITE_API_URL}/attendance/overview?date=${date}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
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
              id: r._id ?? r.id ?? `${(r.email ?? "unknown")}-${timestamp}`,
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
              __ts: s.__ts ?? (s.createdAt ? new Date(s.createdAt).getTime() : Date.now()),
            }))
          : [];

        const formattedStudents: Student[] = Array.isArray(studentsData)
          ? studentsData.map((s: any) => ({
              id: s._id,
              name: s.name,
              email: (s.email ?? "").toLowerCase(),
              department: s.department ?? "",
              status: "absent",
              __ts: s.__ts ?? (s.createdAt ? new Date(s.createdAt).getTime() : Date.now()),
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

    const socketBase = import.meta.env.VITE_SOCKET_URL || window.location.origin;

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
        const checkIn = payload.checkIn ?? payload.checkInTime ?? payload.inTime ?? null;
        const checkOut = payload.checkOut ?? payload.checkOutTime ?? payload.outTime ?? null;
        const dateVal = payload.date ?? payload.attendanceDate ?? payload.createdAt ?? null;
        const timestamp = checkIn ? new Date(checkIn).getTime() : dateVal ? new Date(dateVal).getTime() : Date.now();

        const incoming: AttendanceRecord = {
          id: payload._id ?? payload.id ?? `${(payload.email ?? "unknown")}-${timestamp}`,
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
          // Merge: prefer matching by userId+date, else email+date.
          const incomingDateKey = recordDateKey(incoming.date);
          const findMatchIndex = prev.findIndex((r) => {
            const rDateKey = recordDateKey(r.date);
            // if both have userId, match by that
            if (incoming.userId && r.userId) {
              return String(r.userId) === String(incoming.userId) && rDateKey === incomingDateKey;
            }
            // else match by email
            return r.email && incoming.email && String(r.email).toLowerCase() === String(incoming.email).toLowerCase() && rDateKey === incomingDateKey;
          });

          let updated;
          if (findMatchIndex >= 0) {
            updated = [...prev];
            updated[findMatchIndex] = { ...updated[findMatchIndex], ...incoming };
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
      ? new Date(dateStr).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" })
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
  const handleDeleteClick = (id: string, name: string, type: 'staff' | 'student') => {
    setDeleteTarget({ id, name, type });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      const token = localStorage.getItem("nascomsoft-token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/users/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error("Delete failed");

      if (deleteTarget.type === 'staff') {
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
    if (!newStaff.name || !newStaff.email || !newStaff.position || !newStaff.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("nascomsoft-token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newStaff),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add staff");

      const staffMember: StaffMember = {
        id: data.user._id,
        name: data.user.name,
        email: (data.user.email ?? "").toLowerCase(),
        position: data.user.position ?? "",
        status: "absent",
        __ts: Date.now(), // Add timestamp for new entries
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
    if (!newStudent.name || !newStudent.email || !newStudent.department || !newStudent.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const token = localStorage.getItem("nascomsoft-token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register/student`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(newStudent),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to add student");

      const student: Student = {
        id: data.user._id,
        name: data.user.name,
        email: (data.user.email ?? "").toLowerCase(),
        department: data.user.department ?? "",
        status: "absent",
        __ts: Date.now(), // Add timestamp for new entries
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
    if (!editingStaff || !editStaffForm.name || !editStaffForm.email || !editStaffForm.position) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("nascomsoft-token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/users/${editingStaff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editStaffForm),
      });

      if (!res.ok) throw new Error("Failed to update staff");
      const updatedRes = await res.json();
      const updatedUser = updatedRes.user ?? updatedRes;

      const updatedStaff = staff.map((s) => (s.id === editingStaff.id ? { ...s, ...updatedUser } : s));
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
    if (!editingStudent || !editStudentForm.name || !editStudentForm.email || !editStudentForm.department) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const token = localStorage.getItem("nascomsoft-token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/users/${editingStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editStudentForm),
      });

      if (!res.ok) throw new Error("Failed to update student");
      const updatedRes = await res.json();
      const updatedUser = updatedRes.user ?? updatedRes;

      const updatedStudents = students.map((s) => (s.id === editingStudent.id ? { ...s, ...updatedUser } : s));
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
    const dataToExport = filteredAttendance.length > 0 ? filteredAttendance : attendanceOverview;
    
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
    if (attendanceSearchTerm || attendanceDateFrom || attendanceDateTo || filterRole !== "all") {
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
          student.name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
          student.email?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
          student.department?.toLowerCase().includes(studentSearchTerm.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => (b.__ts ?? 0) - (a.__ts ?? 0)); // Sort by timestamp, newest first
  }, [students, studentSearchTerm]);

  const filteredStaff = useMemo(() => {
    return staff
      .filter((member) => {
        const matchesSearch =
          member.name?.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
          member.email?.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
          member.position?.toLowerCase().includes(staffSearchTerm.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => (b.__ts ?? 0) - (a.__ts ?? 0)); // Sort by timestamp, newest first
  }, [staff, staffSearchTerm]);

  const filteredAttendance = useMemo(() => {
    return attendanceOverview.filter((record) => {
      const matchesSearch =
        record.userName?.toLowerCase().includes(attendanceSearchTerm.toLowerCase()) ||
        record.email?.toLowerCase().includes(attendanceSearchTerm.toLowerCase());
      
      const matchesRole = filterRole === "all" || record.userRole === filterRole;
      
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
  }, [attendanceOverview, attendanceSearchTerm, filterRole, attendanceDateFrom, attendanceDateTo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Enhanced Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    Admin Dashboard
                  </h1>
                  <p className="text-sm text-gray-600">Welcome back, <span className="font-semibold text-blue-600">{user?.name}</span></p>
                </div>
              </div>
            </div>
            <div className="flex text-gray-600 items-center space-x-3">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={logout} className="flex items-center space-x-2 hover:bg-red-50 hover:text-red-600 transition-colors">
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Enhanced KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-semibold text-emerald-100">Total Staff</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Users className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold mb-1">{staff.length}</div>
              <p className="text-xs text-emerald-100 flex items-center">
                <UserCheck className="h-3 w-3 mr-1" />
                {staff.filter((s) => s.status === "present").length} present today
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-xl">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
              <CardTitle className="text-sm font-semibold text-purple-100">Today's Check-ins</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-3xl font-bold mb-1">{todayCheckIns}</div>
              <p className="text-xs text-purple-100 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {totalRecords} total records
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Management Tabs */}
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50">
          <Tabs defaultValue="students" className="space-y-6 p-6">
            <TabsList className="grid w-full grid-cols-3 p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl border border-gray-200/50">
              <TabsTrigger 
                value="students" 
                className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all duration-200"
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Students
              </TabsTrigger>
              <TabsTrigger 
                value="staff" 
                className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-600 transition-all duration-200"
              >
                <Users className="h-4 w-4 mr-2" />
                Staff
              </TabsTrigger>
              <TabsTrigger 
                value="attendance" 
                className="rounded-lg font-semibold data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-purple-600 transition-all duration-200"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Attendance
              </TabsTrigger>
            </TabsList>

            {/* Students Management */}
            <TabsContent value="students" className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Student Management</h3>
                  <p className="text-sm text-gray-600 mt-1">Manage student accounts and information</p>
                </div>
                <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Student
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Add New Student</DialogTitle>
                      <DialogDescription>Enter the student details below.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="student-name" className="text-sm font-semibold text-gray-700">Name</Label>
                        <Input 
                          id="student-name" 
                          value={newStudent.name} 
                          onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} 
                          placeholder="Student name"
                          className="mt-1 text-gray-600"
                        />
                      </div>
                      <div>
                        <Label htmlFor="student-email" className="text-sm font-semibold text-gray-700">Email</Label>
                        <Input 
                          id="student-email" 
                          type="email" 
                          value={newStudent.email} 
                          onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} 
                          placeholder="student@nascomsoft.com"
                          className="mt-1 text-gray-600"
                        />
                      </div>
                      <div>
                        <Label htmlFor="student-department" className="text-sm font-semibold text-gray-700">Department</Label>
                        <Input 
                          id="student-department" 
                          value={newStudent.department} 
                          onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })} 
                          placeholder="Computer Science"
                          className="mt-1 text-gray-600"
                        />
                      </div>
                      <div>
                        <Label htmlFor="student-password" className="text-sm font-semibold text-gray-700">Password</Label>
                        <Input 
                          id="student-password" 
                          type="password" 
                          value={newStudent.password} 
                          onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} 
                          placeholder="Default password"
                          className="mt-1 text-gray-600"
                        />
                      </div>
                    </div>
                    <DialogFooter className="pt-4">
                      <Button variant="outline" onClick={() => setIsAddStudentOpen(false)}>
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
              
              {/* Enhanced Student Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search students by name, email, or department..." 
                  value={studentSearchTerm} 
                  onChange={(e) => setStudentSearchTerm(e.target.value)} 
                  className="pl-10 max-w-md text-gray-600 bg-white/80 backdrop-blur-sm border-gray-200/50 focus:border-blue-300 focus:ring-blue-200/50"
                />
              </div>

              <Card className="shadow-xl border-0 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-gray-400/70">
                      <TableRow className="border-gray-400/70">
                        <TableHead className="font-semibold text-gray-700">Name</TableHead>
                        <TableHead className="font-semibold text-gray-700">Email</TableHead>
                        <TableHead className="font-semibold text-gray-700">Department</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((student) => (
                        <TableRow key={student.id} className="border-gray-300/30 hover:bg-blue-100/30 transition-colors">
                          <TableCell className="font-medium text-gray-600">{student.name}</TableCell>
                          <TableCell className="text-gray-600">{student.email}</TableCell>
                          <TableCell className="text-gray-600">{student.department}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={student.status === "present" ? "default" : "secondary"} 
                              className={`${
                                student.status === "present" 
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                                : "bg-gray-100 text-gray-600 border-gray-200"
                              } font-medium`}
                            >
                              {student.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <div className="flex gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => editStudent(student)} 
                                      className="h-8 w-8 p-0 text-gray-900 hover:bg-blue-100 hover:text-blue-600 transition-colors rounded-lg"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Edit Student</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDeleteClick(student.id, student.name, 'student')} 
                                      className="h-8 w-8 p-0 text-gray-900 hover:bg-red-100 hover:text-red-600 transition-colors rounded-lg"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Delete Student</p></TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredStudents.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">No students found</p>
                      <p className="text-sm">
                        {studentSearchTerm ? "Try adjusting your search criteria." : "Add your first student to get started."}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>

            {/* Staff Management */}
            <TabsContent value="staff" className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Staff Management</h3>
                  <p className="text-sm text-gray-600 mt-1">Manage staff accounts and information</p>
                </div>
                <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Staff
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Add New Staff Member</DialogTitle>
                      <DialogDescription>Enter the staff member details below.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="staff-name" className="text-sm font-semibold text-gray-700">Name</Label>
                        <Input 
                          id="staff-name" 
                          value={newStaff.name} 
                          onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} 
                          placeholder="Staff name"
                          className="mt-1 text-gray-600"
                        />
                      </div>
                      <div>
                        <Label htmlFor="staff-email" className="text-sm font-semibold text-gray-700">Email</Label>
                        <Input 
                          id="staff-email" 
                          type="email" 
                          value={newStaff.email} 
                          onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} 
                          placeholder="staff@nascomsoft.com"
                          className="mt-1 text-gray-600"
                        />
                      </div>
                      <div>
                        <Label htmlFor="staff-position" className="text-sm font-semibold text-gray-700">Position</Label>
                        <Input 
                          id="staff-position" 
                          value={newStaff.position || ""} 
                          onChange={(e) => setNewStaff({ ...newStaff, position: e.target.value })} 
                          placeholder="Senior Developer"
                          className="mt-1 text-gray-600"
                        />
                      </div>
                      <div>
                        <Label htmlFor="staff-password" className="text-sm font-semibold text-gray-700">Password</Label>
                        <Input 
                          id="staff-password" 
                          type="password" 
                          value={newStaff.password} 
                          onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} 
                          placeholder="Default password"
                          className="mt-1 text-gray-600"
                        />
                      </div>
                    </div>
                    <DialogFooter className="pt-4">
                      <Button variant="outline" onClick={() => setIsAddStaffOpen(false)}>
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
              
              {/* Enhanced Staff Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search staff by name, email, or position..." 
                  value={staffSearchTerm} 
                  onChange={(e) => setStaffSearchTerm(e.target.value)} 
                  className="pl-10 max-w-md bg-white/80 backdrop-blur-sm border-gray-200/50 focus:border-emerald-300 focus:ring-emerald-200/50"
                />
              </div>

              <Card className="shadow-xl border-0 rounded-2xl overflow-hidden bg-white/80 backdrop-blur-sm">
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-sm z-10 border-b border-gray-200/50">
                      <TableRow className="border-gray-400/70">
                        <TableHead className="font-semibold text-gray-700">Name</TableHead>
                        <TableHead className="font-semibold text-gray-700">Email</TableHead>
                        <TableHead className="font-semibold text-gray-700">Position</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map((member) => (
                        <TableRow key={member.id} className="border-gray-300/30 hover:bg-emerald-50/30 transition-colors">
                          <TableCell className="text-gray-600">{member.name}</TableCell>
                          <TableCell className="text-gray-600">{member.email}</TableCell>
                          <TableCell className="text-gray-600">{member.position || "_"}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={member.status === "present" ? "default" : "secondary"} 
                              className={`${
                                member.status === "present" 
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200" 
                                : "bg-gray-100 text-gray-600 border-gray-200"
                              } font-medium`}
                            >
                              {member.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <TooltipProvider>
                              <div className="flex gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => editStaff(member)} 
                                      className="h-8 w-8 p-0 text-gray-900 hover:bg-emerald-100 hover:text-emerald-600 transition-colors rounded-lg"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Edit Staff Member</p></TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleDeleteClick(member.id, member.name, 'staff')} 
                                      className="h-8 w-8 p-0 text-gray-900 hover:bg-red-100 hover:text-red-600 transition-colors rounded-lg"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Delete Staff Member</p></TooltipContent>
                                </Tooltip>
                              </div>
                            </TooltipProvider>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredStaff.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">No staff members found</p>
                      <p className="text-sm">
                        {staffSearchTerm ? "Try adjusting your search criteria." : "Add your first staff member to get started."}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </TabsContent>