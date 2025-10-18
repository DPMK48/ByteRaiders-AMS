import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  GraduationCap,
  Users,
  BarChart3,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
  TrendingUp,
  Activity,
} from "lucide-react";
import type { StaffMember, Student, AttendanceRecord } from "../../types/admin.types";
import { getLagosDateKey, recordDateKey } from "../../utils/admin.utils";

interface KPICardsProps {
  staff: StaffMember[];
  students: Student[];
  attendanceOverview: AttendanceRecord[];
}

export function KPICards({ staff, students, attendanceOverview }: KPICardsProps) {
  const todayKey = getLagosDateKey();
  const todayCheckIns = attendanceOverview.filter((r) => {
    const rKey = recordDateKey(r.date);
    return rKey === todayKey && r.checkIn;
  }).length;
  const totalRecords = attendanceOverview.length;

  const attendanceRate =
    students.length + staff.length > 0
      ? Math.round((todayCheckIns / (students.length + staff.length)) * 100)
      : 0;

  return (
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
          <div className="text-4xl font-bold mb-2 tracking-tight">{attendanceRate}%</div>
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
  );
}
