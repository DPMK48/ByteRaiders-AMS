import { useState, useEffect } from "react";
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
  CheckCircle,
  Plus,
  Edit,
  Trash2,
  Download,
  LogOut,
  Search,
  Calendar,
  BarChart3,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { useAuth } from "./AuthProvider";
import type { User, UserRole } from "./AuthProvider";
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
  userId: string;
  userName: string;
  userRole: UserRole;
  email: string;
  date: string;
  checkIn?: Date;
  checkOut?: Date;
  status: "present" | "absent";
}
// interface AttendanceDetails {
//   id: string;
//   user: {
//     name: string;
//     email: string;
//     role: string;
//   };
//   date: string;
//   checkInTime: string;
//   checkOutTime: string;
//   status: string;
// };

export function AdminDashboard() {
  const { user, logout } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("nascomsoft-token");
        if (!token) throw new Error("No auth token found");

        // Fetch all data concurrently
        const [staffRes, studentsRes, overviewRes] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/auth/staff`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/auth/student`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${import.meta.env.VITE_API_URL}/attendance/overview`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        // Ensure all responses are OK
        if (![staffRes, studentsRes, overviewRes].every((res) => res.ok)) {
          throw new Error("One or more requests failed");
        }

        // Parse JSON data
        const [staffData, studentsData, overviewData] = await Promise.all([
          staffRes.json(),
          studentsRes.json(),
          overviewRes.json(),
        ]);

        // Format data
        const formattedStaff = Array.isArray(staffData)
          ? staffData.map((s) => ({ ...s, id: s._id }))
          : [];

        const formattedStudents = Array.isArray(studentsData)
          ? studentsData.map((s) => ({ ...s, id: s._id }))
          : [];

        const formattedOverview = Array.isArray(overviewData)
          ? overviewData.map((record) => ({
              id: record._id,
              userId: record.userId,
              userName: record.name, // backend key: name → userName
              userRole: record.role, // backend key: role → userRole
              email: record.email,
              date: record.date,
              checkIn: record.checkIn,
              checkOut: record.checkOut,
              status: record.status,
            }))
          : [];

        // Set state
        setStaff(formattedStaff);
        setStudents(formattedStudents);
        setAttendanceOverview(formattedOverview);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load staff, students, or overview");
      }
    };

    fetchData();
  }, []);

  const today = new Date().toDateString();
  const todayCheckIns = attendanceOverview.filter((record) => {
    const recordDate = new Date(record.date).toDateString();
    return recordDate === today && record.checkIn;
  }).length;
  const totalRecords = attendanceOverview.length;

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
      const token = localStorage.getItem("nascomsoft-token"); // Admin's JWT token

      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newStaff),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to add staff");
      }

      const staffMember: StaffMember = {
        id: data.user._id,
        name: data.user.name,
        email: data.user.email,
        position: data.user.position,
        status: "absent",
      };

      setStaff((prev) => [...prev, staffMember]);
      setNewStaff({ name: "", email: "", position: "", password: "" });
      setIsAddStaffOpen(false);
      toast.success("Staff member added successfully!");
    } catch (err: any) {
      toast.error(err.message);
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

      if (!res.ok) {
        throw new Error(data.message || "Failed to add student");
      }

      const student: Student = {
        id: data.user._id, // exists now
        name: data.user.name,
        email: data.user.email,
        department: data.user.department,
        status: data.user.status, // now received from backend
      };
      console.log("Response from backend:", data);

      setStudents((prev) => [...prev, student]);
      setNewStudent({ name: "", email: "", department: "", password: "" });
      setIsAddStudentOpen(false);
      toast.success("Student added successfully!");
    } catch (err: any) {
      toast.error(err.message);
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/users/${editingStaff.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editStaffForm),
      });

      if (!res.ok) throw new Error("Failed to update staff");

      const updated = await res.json();

      const updatedStaff = staff.map((s) =>
        s.id === editingStaff.id ? updated : s
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/users/${editingStudent.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editStudentForm),
      });

      if (!res.ok) throw new Error("Failed to update student");

      const { user } = await res.json();

      const updatedStudents = students.map((s) =>
        s.id === editingStudent.id ? user : s
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

  const removeStaff = async (id: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/users/${id}`, {
        method: "DELETE",
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
      console.log("editingStudent:", editingStudent);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/users/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Delete failed");

      setStudents((prev) => {
        const updated = prev.filter((s) => s.id !== id);
        console.log("Updated students after delete:", updated);
        return updated;
      });
      toast.success("Student deleted successfully");
    } catch (error) {
      toast.error("Failed to delete student");
      console.error(error);
    }
  };

  const exportAttendance = () => {
    const csvContent = [
      ["Name", "Role", "Email", "Date", "Check-in", "Check-out", "Status"],
      ...attendanceRecords.map((record) => [
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

  const filteredAttendance = attendanceRecords.filter((record) => {
    const matchesSearch =
      record.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === "all" || record.userRole === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-background-secondary">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-card-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-sm text-foreground-muted">
                Welcome back, {user?.name}
              </p>
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
              <CardTitle className="text-sm font-medium text-foreground-muted">
                Total Students
              </CardTitle>
              <div className="p-2 bg-primary-light rounded-lg">
                <GraduationCap className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {students.length}
              </div>
              <p className="text-xs text-foreground-muted mt-1">
                {students.filter((s) => s.status === "present").length} present
                today
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground-muted">
                Total Staff
              </CardTitle>
              <div className="p-2 bg-primary-light rounded-lg">
                <Users className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {staff.length}
              </div>
              <p className="text-xs text-foreground-muted mt-1">
                {staff.filter((s) => s.status === "present").length} present
                today
              </p>
            </CardContent>
          </Card>

          <Card className="card-elevated card-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-foreground-muted">
                Today's Check-ins
              </CardTitle>
              <div className="p-2 bg-success-light rounded-lg">
                <BarChart3 className="h-4 w-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                {todayCheckIns}
              </div>
              <p className="text-xs text-foreground-muted mt-1">
                Total attendance records: {totalRecords}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="students" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 p-1 bg-background-muted">
            <TabsTrigger
              value="students"
              className="tab-header data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Students
            </TabsTrigger>
            <TabsTrigger
              value="staff"
              className="tab-header data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Staff
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="tab-header data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Attendance Overview
            </TabsTrigger>
          </TabsList>

          {/* Students Management */}
          <TabsContent value="students" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg">Student Management</h3>
              <Dialog
                open={isAddStudentOpen}
                onOpenChange={setIsAddStudentOpen}
              >
                <DialogTrigger asChild>
                  <Button className="button-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Student</DialogTitle>
                    <DialogDescription>
                      Enter the student details below.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="student-name">Name</Label>
                      <Input
                        id="student-name"
                        value={newStudent.name}
                        onChange={(e) =>
                          setNewStudent({ ...newStudent, name: e.target.value })
                        }
                        placeholder="Student name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="student-email">Email</Label>
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
                      />
                    </div>
                    <div>
                      <Label htmlFor="student-department">Department</Label>
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
                      />
                    </div>
                    <div>
                      <Label htmlFor="student-password">Password</Label>
                      <Input
                        id="student-password"
                        type="password"
                        value={newStudent.password}
                        onChange={(e) =>
                          setNewStudent({
                            ...newStudent,
                            password: e.target.value,
                          })
                        }
                        placeholder="Default password"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddStudentOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={addStudent} className="button-primary">
                      Add Student
                    </Button>
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
                        <Badge
                          variant={
                            student.status === "present"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            student.status === "present" ? "status-success" : ""
                          }
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
                                  className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Student</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeStudent(student.id)}
                                  className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Student</p>
                              </TooltipContent>
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
                    <DialogDescription>
                      Enter the staff member details below.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="staff-name">Name</Label>
                      <Input
                        id="staff-name"
                        value={newStaff.name}
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, name: e.target.value })
                        }
                        placeholder="Staff name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="staff-email">Email</Label>
                      <Input
                        id="staff-email"
                        type="email"
                        value={newStaff.email}
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, email: e.target.value })
                        }
                        placeholder="staff@nascomsoft.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="staff-position">Position</Label>
                      <Input
                        id="staff-position"
                        value={newStaff.position || ""}
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, position: e.target.value })
                        }
                        placeholder="Senior Developer"
                      />
                    </div>
                    <div>
                      <Label htmlFor="staff-password">Password</Label>
                      <Input
                        id="staff-password"
                        type="password"
                        value={newStaff.password}
                        onChange={(e) =>
                          setNewStaff({ ...newStaff, password: e.target.value })
                        }
                        placeholder="Default password"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsAddStaffOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={addStaff} className="button-primary">
                      Add Staff
                    </Button>
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
                        <Badge
                          variant={
                            member.status === "present"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            member.status === "present" ? "status-success" : ""
                          }
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
                                  className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit Staff Member</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeStaff(member.id)}
                                  className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Delete Staff Member</p>
                              </TooltipContent>
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
                <Input
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <Select
                value={filterRole}
                onValueChange={(value: any) => setFilterRole(value)}
              >
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
                  {attendanceOverview.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{record.userName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {record.userRole}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.email}</TableCell>
                      <TableCell>
                        {new Date(record.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {record.checkIn
                          ? new Date(record.checkIn).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              }
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {record.checkOut
                          ? new Date(record.checkOut).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              }
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            record.status === "present"
                              ? "default"
                              : "destructive"
                          }
                        >
                          {record.status.charAt(0).toUpperCase() +
                            record.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredAttendance.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No attendance records found.
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Student Dialog */}
        <Dialog open={isEditStudentOpen} onOpenChange={setIsEditStudentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Student</DialogTitle>
              <DialogDescription>
                Update the student details below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-student-name">Name</Label>
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
                />
              </div>
              <div>
                <Label htmlFor="edit-student-email">Email</Label>
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
                />
              </div>
              <div>
                <Label htmlFor="edit-student-department">Department</Label>
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
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditStudentOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={updateStudent} className="button-primary">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Staff Dialog */}
        <Dialog open={isEditStaffOpen} onOpenChange={setIsEditStaffOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Staff Member</DialogTitle>
              <DialogDescription>
                Update the staff member details below.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-staff-name">Name</Label>
                <Input
                  id="edit-staff-name"
                  value={editStaffForm.name}
                  onChange={(e) =>
                    setEditStaffForm({ ...editStaffForm, name: e.target.value })
                  }
                  placeholder="Staff name"
                />
              </div>
              <div>
                <Label htmlFor="edit-staff-email">Email</Label>
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
                />
              </div>
              <div>
                <Label htmlFor="edit-staff-position">Position</Label>
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
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditStaffOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={updateStaff} className="button-primary">
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
