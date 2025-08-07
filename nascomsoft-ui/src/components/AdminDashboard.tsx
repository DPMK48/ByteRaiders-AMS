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
}

interface Student {
  id: string;
  name: string;
  email: string;
  department: string;
  status: "present" | "absent";
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

  // socket ref
  const socketRef = useRef<any>(null);

  //
  // Helpers (Lagos date normalization)
  //
  const getLagosDateKey = (d = new Date()) =>
    new Date(d).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }); // "YYYY-MM-DD"

  const recordDateKey = (dateStr?: string | Date | null) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" })
      : null;

  const sortOverview = (arr: AttendanceRecord[]) =>
    arr.sort((a, b) => (b.__ts ?? 0) - (a.__ts ?? 0));

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
            }))
          : [];

        const formattedStudents: Student[] = Array.isArray(studentsData)
          ? studentsData.map((s: any) => ({
              id: s._id,
              name: s.name,
              email: (s.email ?? "").toLowerCase(),
              department: s.department ?? "",
              status: "absent",
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
      socketRef.current = socket;

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
  // Add / Edit / Remove operations (ensure token included)
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
    // Use filtered attendance data instead of all attendance
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
    
    // Add filter info to filename
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
    return students.filter((student) => {
      const matchesSearch =
        student.name?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.department?.toLowerCase().includes(studentSearchTerm.toLowerCase());
      return matchesSearch;
    });
  }, [students, studentSearchTerm]);

  const filteredStaff = useMemo(() => {
    return staff.filter((member) => {
      const matchesSearch =
        member.name?.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
        member.email?.toLowerCase().includes(staffSearchTerm.toLowerCase()) ||
        member.position?.toLowerCase().includes(staffSearchTerm.toLowerCase());
      return matchesSearch;
    });
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
            // Include the entire "to" date by setting time to end of day
            toDate.setHours(23, 59, 59, 999);
            matchesDateRange = matchesDateRange && recordDateObj <= toDate;
          }
        }
      }
      
      return matchesSearch && matchesRole && matchesDateRange;
    });
  }, [attendanceOverview, attendanceSearchTerm, filterRole, attendanceDateFrom, attendanceDateTo]);

  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-foreground-muted">Welcome back, {user?.name}</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="card-elevated card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-foreground-muted">Total Students</CardTitle>
              <div className="p-2 bg-primary-light rounded-lg">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{students.length}</div>
              <p className="text-xs text-foreground-muted mt-1">
                {students.filter((s) => s.status === "present").length} present today
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-foreground-muted">Total Staff</CardTitle>
              <div className="p-2 bg-primary-light rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{staff.length}</div>
              <p className="text-xs text-foreground-muted mt-1">
                {staff.filter((s) => s.status === "present").length} present today
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-bold text-foreground-muted">Today's Check-ins</CardTitle>
              <div className="p-2 bg-success-light rounded-lg">
                <BarChart3 className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{todayCheckIns}</div>
              <p className="text-xs text-foreground-muted mt-1">Total attendance records: {totalRecords}</p>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 p-1 bg-background-muted">
            <TabsTrigger value="students" className="tab-header data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Students</TabsTrigger>
            <TabsTrigger value="staff" className="tab-header data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Staff</TabsTrigger>
            <TabsTrigger value="attendance" className="tab-header data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Attendance Overview</TabsTrigger>
          </TabsList>

          {/* Students Management */}
          <TabsContent value="students" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Student Management</h3>
              <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                <DialogTrigger asChild>
                  <Button className="button-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-bold">Add New Student</DialogTitle>
                    <DialogDescription>Enter the student details below.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="student-name" className="font-bold">Name</Label>
                      <Input id="student-name" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} placeholder="Student name" />
                    </div>
                    <div>
                      <Label htmlFor="student-email" className="font-bold">Email</Label>
                      <Input id="student-email" type="email" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} placeholder="student@nascomsoft.com" />
                    </div>
                    <div>
                      <Label htmlFor="student-department" className="font-bold">Department</Label>
                      <Input id="student-department" value={newStudent.department} onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })} placeholder="Computer Science" />
                    </div>
                    <div>
                      <Label htmlFor="student-password" className="font-bold">Password</Label>
                      <Input id="student-password" type="password" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} placeholder="Default password" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddStudentOpen(false)}>Cancel</Button>
                    <Button onClick={addStudent} className="button-primary">Add Student</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Student Search */}
            <div className="flex-1">
              <Input 
                placeholder="Search students by name, email, or department..." 
                value={studentSearchTerm} 
                onChange={(e) => setStudentSearchTerm(e.target.value)} 
                className="max-w-sm border-gray-300" 
              />
            </div>

            <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <TableRow>
                      <TableHead className="font-bold">Name</TableHead>
                      <TableHead className="font-bold">Email</TableHead>
                      <TableHead className="font-bold">Department</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>{student.email}</TableCell>
                        <TableCell>{student.department}</TableCell>
                        <TableCell>
                          <Badge variant={student.status === "present" ? "default" : "secondary"} className={student.status === "present" ? "status-success" : ""}>
                            {student.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <div className="flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => editStudent(student)} className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Edit Student</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(student.id, student.name, 'student')} className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 transition-colors">
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
                  <div className="text-center py-8 text-muted-foreground">
                    {studentSearchTerm ? "No students found matching your search." : "No students found."}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Staff Management */}
          <TabsContent value="staff" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold">Staff Management</h3>
              <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                <DialogTrigger asChild>
                  <Button className="button-primary button-enhanced">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="font-bold">Add New Staff Member</DialogTitle>
                    <DialogDescription>Enter the staff member details below.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="staff-name" className="font-bold">Name</Label>
                      <Input id="staff-name" value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Staff name" />
                    </div>
                    <div>
                      <Label htmlFor="staff-email" className="font-bold">Email</Label>
                      <Input id="staff-email" type="email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="staff@nascomsoft.com" />
                    </div>
                    <div>
                      <Label htmlFor="staff-position" className="font-bold">Position</Label>
                      <Input id="staff-position" value={newStaff.position || ""} onChange={(e) => setNewStaff({ ...newStaff, position: e.target.value })} placeholder="Senior Developer" />
                    </div>
                    <div>
                      <Label htmlFor="staff-password" className="font-bold">Password</Label>
                      <Input id="staff-password" type="password" value={newStaff.password} onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} placeholder="Default password" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddStaffOpen(false)}>Cancel</Button>
                    <Button onClick={addStaff} className="button-primary">Add Staff</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Staff Search */}
            <div className="flex-1">
              <Input 
                placeholder="Search staff by name, email, or position..." 
                value={staffSearchTerm} 
                onChange={(e) => setStaffSearchTerm(e.target.value)} 
                className="max-w-sm border-gray-300" 
              />
            </div>

            <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <TableRow>
                      <TableHead className="font-bold">Name</TableHead>
                      <TableHead className="font-bold">Email</TableHead>
                      <TableHead className="font-bold">Position</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                      <TableHead className="font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStaff.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>{member.name}</TableCell>
                        <TableCell>{member.email}</TableCell>
                        <TableCell>{member.position || "_"}</TableCell>
                        <TableCell>
                          <Badge variant={member.status === "present" ? "default" : "secondary"} className={member.status === "present" ? "status-success" : ""}>
                            {member.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <div className="flex gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => editStaff(member)} className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Edit Staff Member</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(member.id, member.name, 'staff')} className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 transition-colors">
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
                  <div className="text-center py-8 text-muted-foreground">
                    {staffSearchTerm ? "No staff members found matching your search." : "No staff members found."}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Attendance Overview */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h3 className="text-lg font-bold">Attendance Overview</h3>
              <div className="flex gap-2">
                <Button onClick={exportAttendance} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export {filteredAttendance.length > 0 && (attendanceSearchTerm || attendanceDateFrom || attendanceDateTo || filterRole !== "all") 
                    ? `Filtered (${filteredAttendance.length})` 
                    : 'All'} CSV
                </Button>
              </div>
            </div>

            {/* Attendance Search and Filters */}
            <div className="space-y-4">
              {/* Name/Email Search and Role Filter on same line */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <div className="flex-1">
                  <Input 
                    placeholder="Search by name or email..." 
                    value={attendanceSearchTerm} 
                    onChange={(e) => setAttendanceSearchTerm(e.target.value)} 
                    className="max-w-md border-gray-300" 
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={filterRole} onValueChange={(value: any) => setFilterRole(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Date Search - Single Day First */}
              <div className="space-y-3 flex flex-col items-start">
                <div className="flex gap-3 items-center">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <Label className="text-sm font-bold">Search by Date:</Label>
                  <Input
                    type="date"
                    placeholder="Select specific date"
                    value={attendanceDateFrom === attendanceDateTo ? attendanceDateFrom : ""}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      setAttendanceDateFrom(selectedDate);
                      setAttendanceDateTo(selectedDate);
                    }}
                    className="w-40 font-bold"
                  />
                </div>
                
                {/* Custom Date Range */}
                <div className="ml-1 flex items-center">
                  <Label className="text-sm text-gray-600 pr-3">Or select custom range:</Label>
                  <div className="flex gap-2 items-center">
                    <Input
                      type="date"
                      placeholder="From date"
                      value={attendanceDateFrom}
                      onChange={(e) => setAttendanceDateFrom(e.target.value)}
                      className="w-40 font-bold"
                    />
                    <span className="text-sm text-gray-500 pr-1">to</span>
                    <Input
                      type="date"
                      placeholder="To date"
                      value={attendanceDateTo}
                      onChange={(e) => setAttendanceDateTo(e.target.value)}
                      className="w-40 font-bold"
                    />
                  </div>
                  
                  {/* Quick Date Range Buttons */}
                  <div className="flex flex-wrap gap-2 pl-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDateRange(1)}
                      className="text-xs"
                    >
                      Last Month
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDateRange(3)}
                      className="text-xs"
                    >
                      Last 3 Months
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDateRange(6)}
                      className="text-xs"
                    >
                      Last 6 Months
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setDateRange(12)}
                      className="text-xs"
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

            <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                    <TableRow>
                      <TableHead className="font-bold">Name</TableHead>
                      <TableHead className="font-bold">Role</TableHead>
                      <TableHead className="font-bold">Email</TableHead>
                      <TableHead className="font-bold">Date</TableHead>
                      <TableHead className="font-bold">Check-in</TableHead>
                      <TableHead className="font-bold">Check-out</TableHead>
                      <TableHead className="font-bold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{record.userName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {record.userRole}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.email}</TableCell>
                        <TableCell>{record.date ? new Date(record.date).toLocaleDateString() : "-"}</TableCell>
                        <TableCell>
                          {record.checkIn ? new Date(record.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "-"}
                        </TableCell>
                        <TableCell>
                          {record.checkOut ? new Date(record.checkOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }) : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={record.status === "present" ? "default" : "destructive"} className={"status-success"}>
                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredAttendance.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    {attendanceSearchTerm || attendanceDateFrom || attendanceDateTo || filterRole !== "all" 
                      ? "No attendance records found matching your search criteria." 
                      : "No attendance records found."
                    }
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-bold">Are you sure you want to delete this {deleteTarget?.type}?</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to delete <strong>{deleteTarget?.name}</strong>. This action cannot be undone and will permanently remove the {deleteTarget?.type} from the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleDeleteCancel}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              >
                Delete {deleteTarget?.type === 'staff' ? 'Staff Member' : 'Student'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Student Dialog */}
        <Dialog open={isEditStudentOpen} onOpenChange={setIsEditStudentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-bold">Edit Student</DialogTitle>
              <DialogDescription>Update the student details below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-student-name" className="font-bold">Name</Label>
                <Input id="edit-student-name" value={editStudentForm.name} onChange={(e) => setEditStudentForm({ ...editStudentForm, name: e.target.value })} placeholder="Student name" />
              </div>
              <div>
                <Label htmlFor="edit-student-email" className="font-bold">Email</Label>
                <Input id="edit-student-email" type="email" value={editStudentForm.email} onChange={(e) => setEditStudentForm({ ...editStudentForm, email: e.target.value })} placeholder="student@nascomsoft.com" />
              </div>
              <div>
                <Label htmlFor="edit-student-department" className="font-bold">Department</Label>
                <Input id="edit-student-department" value={editStudentForm.department} onChange={(e) => setEditStudentForm({ ...editStudentForm, department: e.target.value })} placeholder="Computer Science" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditStudentOpen(false)}>Cancel</Button>
              <Button onClick={updateStudent} className="button-primary">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={isEditStaffOpen} onOpenChange={setIsEditStaffOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-bold">Edit Staff Member</DialogTitle>
              <DialogDescription>Update the staff member details below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-staff-name" className="font-bold">Name</Label>
                <Input id="edit-staff-name" value={editStaffForm.name} onChange={(e) => setEditStaffForm({ ...editStaffForm, name: e.target.value })} placeholder="Staff name" />
              </div>
              <div>
                <Label htmlFor="edit-staff-email" className="font-bold">Email</Label>
                <Input id="edit-staff-email" type="email" value={editStaffForm.email} onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })} placeholder="staff@nascomsoft.com" />
              </div>
              <div>
                <Label htmlFor="edit-staff-position" className="font-bold">Position</Label>
                <Input id="edit-staff-position" value={editStaffForm.position} onChange={(e) => setEditStaffForm({ ...editStaffForm, position: e.target.value })} placeholder="Senior Developer" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditStaffOpen(false)}>Cancel</Button>
              <Button onClick={updateStaff} className="button-primary">Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}