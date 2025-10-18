import { useMemo } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Download,
  Calendar,
  Search,
  Filter,
  Sparkles,
  Activity,
  CheckCircle2,
  XCircle,
  FileText,
} from "lucide-react";
import type { AttendanceRecord } from "../../types/admin.types";
import type { UserRole } from "../AuthProvider";
import { recordDateKey } from "../../utils/admin.utils";

interface AttendanceTabProps {
  attendanceOverview: AttendanceRecord[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  dateFrom: string;
  setDateFrom: (date: string) => void;
  dateTo: string;
  setDateTo: (date: string) => void;
  filterRole: "all" | UserRole;
  setFilterRole: (role: "all" | UserRole) => void;
  onExport: () => void;
}

export function AttendanceTab({
  attendanceOverview,
  searchTerm,
  setSearchTerm,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  filterRole,
  setFilterRole,
  onExport,
}: AttendanceTabProps) {
  const filteredAttendance = useMemo(() => {
    return attendanceOverview.filter((record) => {
      const matchesSearch =
        !searchTerm ||
        record.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.email.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        filterRole === "all" || record.userRole === filterRole;

      let matchesDate = true;
      if (dateFrom || dateTo) {
        const recKey = recordDateKey(record.date);
        if (recKey) {
          if (dateFrom && dateTo) {
            matchesDate = recKey >= dateFrom && recKey <= dateTo;
          } else if (dateFrom) {
            matchesDate = recKey >= dateFrom;
          } else if (dateTo) {
            matchesDate = recKey <= dateTo;
          }
        } else {
          matchesDate = false;
        }
      }

      return matchesSearch && matchesRole && matchesDate;
    });
  }, [attendanceOverview, searchTerm, filterRole, dateFrom, dateTo]);

  const setDateRange = (months: number) => {
    const today = new Date();
    const from = new Date(today);
    from.setMonth(today.getMonth() - months);
    setDateFrom(from.toISOString().split("T")[0]);
    setDateTo(today.toISOString().split("T")[0]);
  };

  const clearDateRange = () => {
    setDateFrom("");
    setDateTo("");
  };

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
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
            onClick={onExport}
            variant="outline"
            className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 hover:bg-white dark:text-gray-300 dark:hover:bg-slate-700 hover:shadow-lg hover:scale-105 transition-all duration-300 rounded-xl"
          >
            <Download className="h-4 w-4 mr-2" />
            Export{" "}
            {filteredAttendance.length > 0 &&
            (searchTerm || dateFrom || dateTo || filterRole !== "all")
              ? `Filtered (${filteredAttendance.length})`
              : "All"}{" "}
            CSV
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 bg-gradient-to-br from-white/90 to-gray-50/90 dark:from-slate-800/90 dark:to-slate-900/90 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-gray-200/60 dark:border-gray-700/60 shadow-xl">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-purple-500 transition-colors duration-200" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-4 py-6 max-w-2xl text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 focus:border-purple-400 dark:focus:border-purple-500 focus:ring-2 focus:ring-purple-200/50 dark:focus:ring-purple-500/30 rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
            />
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/30 dark:to-indigo-900/30 rounded-xl">
              <Filter className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                Filter
              </span>
            </div>
            <Select
              value={filterRole}
              onValueChange={(value: any) => setFilterRole(value)}
            >
              <SelectTrigger className="w-44 text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-gray-200/60 dark:border-gray-700/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="staff">Staff Only</SelectItem>
                <SelectItem value="student">Students Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Range */}
        <div className="space-y-3">
          <div className="flex gap-3 items-center">
            <Calendar className="h-4 w-4 text-purple-500" />
            <Label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Search by Date:
            </Label>
            <Input
              type="date"
              placeholder="Select specific date"
              value={dateFrom === dateTo ? dateFrom : ""}
              onChange={(e) => {
                const selectedDate = e.target.value;
                setDateFrom(selectedDate);
                setDateTo(selectedDate);
              }}
              className="w-44 text-gray-600 font-semibold bg-white/80 backdrop-blur-sm border-gray-200/50 dark:text-gray-800"
            />
          </div>

          <div className="ml-7 flex flex-wrap items-center gap-3">
            <Label className="text-sm text-gray-600 dark:text-gray-300">
              Or select custom range:
            </Label>
            <div className="flex gap-2 items-center">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-44 text-gray-600 font-semibold bg-white/80 backdrop-blur-sm border-gray-200/50 dark:text-gray-800"
              />
              <span className="text-sm text-gray-500 dark:text-gray-300">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-44 text-gray-600 font-semibold bg-white/80 backdrop-blur-sm border-gray-200/50 dark:text-gray-800"
              />
            </div>

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
              {(dateFrom || dateTo) && (
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
                      <div
                        className={`h-8 w-8 rounded-full ${
                          record.userRole === "staff"
                            ? "bg-gradient-to-br from-emerald-500 to-teal-500"
                            : "bg-gradient-to-br from-blue-500 to-indigo-500"
                        } flex items-center justify-center text-white text-sm font-bold shadow-md`}
                      >
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
                    {record.checkIn &&
                    !isNaN(new Date(record.checkIn).getTime()) ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 text-green-800 dark:text-green-300 text-xs font-bold rounded-lg shadow-sm border border-green-200 dark:border-green-700">
                        <Activity className="h-3 w-3" />
                        {new Date(record.checkIn).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600 dark:text-gray-400">
                    {record.checkOut &&
                    !isNaN(new Date(record.checkOut).getTime()) ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 text-orange-800 dark:text-orange-300 text-xs font-bold rounded-lg shadow-sm border border-orange-200 dark:border-orange-700">
                        <Activity className="h-3 w-3" />
                        {new Date(record.checkOut).toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    ) : (
                      <span className="text-gray-400 dark:text-gray-600">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        record.status === "present" ? "default" : "destructive"
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
                {searchTerm || dateFrom || dateTo || filterRole !== "all"
                  ? "Try adjusting your search criteria or date range to find records."
                  : "Attendance records will appear here once users check in."}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
