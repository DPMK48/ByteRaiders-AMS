import { useState } from "react";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { LogOut, BarChart3, GraduationCap, Users } from "lucide-react";
import { useAuth } from "./AuthProvider";
import type { UserRole } from "./AuthProvider";
import { ThemeToggle } from "./ThemeToggle";
import { toast } from "sonner";

// Hooks
import { useAdminData, useSocketConnection } from "../hooks/useAdminData";

// Components
import { KPICards } from "./admin/KPICards";
import { AttendanceTab } from "./admin/AttendanceTab";
import { StudentsTab } from "./admin/StudentsTab";
import { StaffTab } from "./admin/StaffTab";
import { DeleteConfirmDialog } from "./admin/DeleteConfirmDialog";

// Types
import type {
  NewStudentForm,
  NewStaffForm,
  EditStudentForm,
  EditStaffForm,
  DeleteTarget,
  Student,
  StaffMember,
} from "../types/admin.types";

export function AdminDashboard() {
  const { user, logout } = useAuth();

  // Use custom hooks for data management
  const {
    staff,
    students,
    attendanceOverview,
    setStaff,
    setStudents,
    setAttendanceOverview,
  } = useAdminData();

  // Socket connection for real-time updates
  useSocketConnection(setAttendanceOverview, setStaff, setStudents);

  // Dialog states
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isEditStaffOpen, setIsEditStaffOpen] = useState(false);
  const [isEditStudentOpen, setIsEditStudentOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Search states
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [staffSearchTerm, setStaffSearchTerm] = useState("");
  const [attendanceSearchTerm, setAttendanceSearchTerm] = useState("");
  const [attendanceDateFrom, setAttendanceDateFrom] = useState("");
  const [attendanceDateTo, setAttendanceDateTo] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | UserRole>("all");

  // Editing states
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form states
  const [newStaff, setNewStaff] = useState<NewStaffForm>({
    name: "",
    email: "",
    position: "",
    password: "",
  });
  const [newStudent, setNewStudent] = useState<NewStudentForm>({
    name: "",
    email: "",
    department: "",
    password: "",
  });
  const [editStaffForm, setEditStaffForm] = useState<EditStaffForm>({
    name: "",
    email: "",
    position: "",
  });
  const [editStudentForm, setEditStudentForm] = useState<EditStudentForm>({
    name: "",
    email: "",
    department: "",
  });

  // Delete handlers
  const handleDeleteClick = (id: string, name: string, type: "staff" | "student") => {
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

  // Add operations
  const addStaff = async () => {
    if (!newStaff.name || !newStaff.email || !newStaff.position || !newStaff.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("nascomsoft-token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register/staff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
        __ts: Date.now(),
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/register/student`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
        __ts: Date.now(),
      };

      setStudents((prev) => [student, ...prev]);
      setNewStudent({ name: "", email: "", department: "", password: "" });
      setIsAddStudentOpen(false);
      toast.success("Student added successfully!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to add student");
    }
  };

  // Edit operations
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

  // Export attendance
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-slate-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-sm border-b border-gray-200/60 dark:border-gray-700/50 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="relative group">
                  <div className="absolute inset-0 rounded-2xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative rounded-2xl group-hover:scale-105 transition-transform duration-300">
                    <img src="/logo.png" alt="" className="w-14" />
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
        {/* KPI Cards */}
        <KPICards
          staff={staff}
          students={students}
          attendanceOverview={attendanceOverview}
        />

        {/* Management Tabs */}
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

            <TabsContent value="attendance">
              <AttendanceTab
                attendanceOverview={attendanceOverview}
                searchTerm={attendanceSearchTerm}
                setSearchTerm={setAttendanceSearchTerm}
                dateFrom={attendanceDateFrom}
                setDateFrom={setAttendanceDateFrom}
                dateTo={attendanceDateTo}
                setDateTo={setAttendanceDateTo}
                filterRole={filterRole}
                setFilterRole={setFilterRole}
                onExport={exportAttendance}
              />
            </TabsContent>

            <TabsContent value="students">
              <StudentsTab
                students={students}
                searchTerm={studentSearchTerm}
                setSearchTerm={setStudentSearchTerm}
                isAddOpen={isAddStudentOpen}
                setIsAddOpen={setIsAddStudentOpen}
                isEditOpen={isEditStudentOpen}
                setIsEditOpen={setIsEditStudentOpen}
                newStudentForm={newStudent}
                setNewStudentForm={setNewStudent}
                editStudentForm={editStudentForm}
                setEditStudentForm={setEditStudentForm}
                onAddStudent={addStudent}
                onEditStudent={editStudent}
                onUpdateStudent={updateStudent}
                onDeleteClick={(id, name) => handleDeleteClick(id, name, "student")}
              />
            </TabsContent>

            <TabsContent value="staff">
              <StaffTab
                staff={staff}
                searchTerm={staffSearchTerm}
                setSearchTerm={setStaffSearchTerm}
                isAddOpen={isAddStaffOpen}
                setIsAddOpen={setIsAddStaffOpen}
                isEditOpen={isEditStaffOpen}
                setIsEditOpen={setIsEditStaffOpen}
                newStaffForm={newStaff}
                setNewStaffForm={setNewStaff}
                editStaffForm={editStaffForm}
                setEditStaffForm={setEditStaffForm}
                onAddStaff={addStaff}
                onEditStaff={editStaff}
                onUpdateStaff={updateStaff}
                onDeleteClick={(id, name) => handleDeleteClick(id, name, "staff")}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          targetName={deleteTarget.name}
          targetType={deleteTarget.type}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}
    </div>
  );
}
