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
  Users,
  GraduationCap,
  Plus,
  Edit,
  Trash2,
  Download,
  LogOut,
  BarChart3,
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
  const [searchTerm, setSearchTerm] = useState("");
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

      setStaff((prev) => [...prev, staffMember]);
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

      setStudents((prev) => [...prev, student]);
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

  const removeStaff = async (id: string) => {
    try {
      const token = localStorage.getItem("nascomsoft-token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setStaff((prev) => prev.filter((s) => s.id !== id));
      toast.success("Staff deleted successfully");
    } catch (error) {
      toast.error("Failed to delete staff");
      console.error(error);
    }
  };

  const removeStudent = async (id: string) => {
    try {
      const token = localStorage.getItem("nascomsoft-token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      setStudents((prev) => prev.filter((s) => s.id !== id));
      toast.success("Student deleted successfully");
    } catch (error) {
      toast.error("Failed to delete student");
      console.error(error);
    }
  };

  //
  // Export (CSV) - uses attendanceOverview (single source of truth)
  //
  const exportAttendance = () => {
    const csvContent = [
      ["Name", "Role", "Email", "Date", "Check-in", "Check-out", "Status"],
      ...attendanceOverview.map((record) => [
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
    a.download = `attendance-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  //
  // Filtering / search (use attendanceOverview)
  //
  const filteredAttendance = useMemo(() => {
    return attendanceOverview.filter((record) => {
      const matchesSearch =
        record.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filterRole === "all" || record.userRole === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [attendanceOverview, searchTerm, filterRole]);

  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-card-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
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
              <CardTitle className="text-sm font-medium text-foreground-muted">Total Students</CardTitle>
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
              <CardTitle className="text-sm font-medium text-foreground-muted">Total Staff</CardTitle>
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
              <CardTitle className="text-sm font-medium text-foreground-muted">Today's Check-ins</CardTitle>
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
              <h3 className="text-lg">Student Management</h3>
              <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                <DialogTrigger asChild>
                  <Button className="button-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
                    <DialogDescription>Enter the student details below.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="student-name">Name</Label>
                      <Input id="student-name" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} placeholder="Student name" />
                    </div>
                    <div>
                      <Label htmlFor="student-email">Email</Label>
                      <Input id="student-email" type="email" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} placeholder="student@nascomsoft.com" />
                    </div>
                    <div>
                      <Label htmlFor="student-department">Department</Label>
                      <Input id="student-department" value={newStudent.department} onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })} placeholder="Computer Science" />
                    </div>
                    <div>
                      <Label htmlFor="student-password">Password</Label>
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

            <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
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
                                <Button variant="ghost" size="sm" onClick={() => removeStudent(student.id)} className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 transition-colors">
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
            </Card>
          </TabsContent>

          {/* Staff Management */}
          <TabsContent value="staff" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg">Staff Management</h3>
              <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
                <DialogTrigger asChild>
                  <Button className="button-primary button-enhanced">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Staff Member</DialogTitle>
                    <DialogDescription>Enter the staff member details below.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="staff-name">Name</Label>
                      <Input id="staff-name" value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Staff name" />
                    </div>
                    <div>
                      <Label htmlFor="staff-email">Email</Label>
                      <Input id="staff-email" type="email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="staff@nascomsoft.com" />
                    </div>
                    <div>
                      <Label htmlFor="staff-position">Position</Label>
                      <Input id="staff-position" value={newStaff.position || ""} onChange={(e) => setNewStaff({ ...newStaff, position: e.target.value })} placeholder="Senior Developer" />
                    </div>
                    <div>
                      <Label htmlFor="staff-password">Password</Label>
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

            <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map((member) => (
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
                                <Button variant="ghost" size="sm" onClick={() => removeStaff(member.id)} className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 transition-colors">
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
            </Card>
          </TabsContent>

          {/* Attendance Overview */}
          <TabsContent value="attendance" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h3 className="text-lg">Attendance Overview</h3>
              <div className="flex gap-2">
                <Button onClick={exportAttendance} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="max-w-sm" />
              </div>
              <Select value={filterRole} onValueChange={(value: any) => setFilterRole(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="shadow-lg border-0 rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Check-in</TableHead>
                    <TableHead>Check-out</TableHead>
                    <TableHead>Status</TableHead>
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
                        <Badge variant={record.status === "present" ? "default" : "destructive"}>
                          {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredAttendance.length === 0 && <div className="text-center py-8 text-muted-foreground">No attendance records found.</div>}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Student Dialog */}
        <Dialog open={isEditStudentOpen} onOpenChange={setIsEditStudentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>Update the student details below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-student-name">Name</Label>
                <Input id="edit-student-name" value={editStudentForm.name} onChange={(e) => setEditStudentForm({ ...editStudentForm, name: e.target.value })} placeholder="Student name" />
              </div>
              <div>
                <Label htmlFor="edit-student-email">Email</Label>
                <Input id="edit-student-email" type="email" value={editStudentForm.email} onChange={(e) => setEditStudentForm({ ...editStudentForm, email: e.target.value })} placeholder="student@nascomsoft.com" />
              </div>
              <div>
                <Label htmlFor="edit-student-department">Department</Label>
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
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>Update the staff member details below.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-staff-name">Name</Label>
                <Input id="edit-staff-name" value={editStaffForm.name} onChange={(e) => setEditStaffForm({ ...editStaffForm, name: e.target.value })} placeholder="Staff name" />
              </div>
              <div>
                <Label htmlFor="edit-staff-email">Email</Label>
                <Input id="edit-staff-email" type="email" value={editStaffForm.email} onChange={(e) => setEditStaffForm({ ...editStaffForm, email: e.target.value })} placeholder="staff@nascomsoft.com" />
              </div>
              <div>
                <Label htmlFor="edit-staff-position">Position</Label>
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
