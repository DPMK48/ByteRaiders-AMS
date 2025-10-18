import { useMemo } from "react";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  Search,
  Sparkles,
  Edit,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { StaffMember, NewStaffForm, EditStaffForm } from "../../types/admin.types";
import { AddStaffDialog } from "./AddStaffDialog";
import { EditStaffDialog } from "./EditStaffDialog";

interface StaffTabProps {
  staff: StaffMember[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  isAddOpen: boolean;
  setIsAddOpen: (open: boolean) => void;
  isEditOpen: boolean;
  setIsEditOpen: (open: boolean) => void;
  newStaffForm: NewStaffForm;
  setNewStaffForm: (form: NewStaffForm) => void;
  editStaffForm: EditStaffForm;
  setEditStaffForm: (form: EditStaffForm) => void;
  onAddStaff: () => void;
  onEditStaff: (staff: StaffMember) => void;
  onUpdateStaff: () => void;
  onDeleteClick: (id: string, name: string) => void;
}

export function StaffTab({
  staff,
  searchTerm,
  setSearchTerm,
  isAddOpen,
  setIsAddOpen,
  isEditOpen,
  setIsEditOpen,
  newStaffForm,
  setNewStaffForm,
  editStaffForm,
  setEditStaffForm,
  onAddStaff,
  onEditStaff,
  onUpdateStaff,
  onDeleteClick,
}: StaffTabProps) {
  const filteredStaff = useMemo(() => {
    return staff.filter(
      (member) =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.position && member.position.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [staff, searchTerm]);

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-500">
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
        <AddStaffDialog
          open={isAddOpen}
          onOpenChange={setIsAddOpen}
          formData={newStaffForm}
          onFormChange={setNewStaffForm}
          onSubmit={onAddStaff}
        />
      </div>

      {/* Search */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-200" />
        <Input
          placeholder="Search staff by name, email, or position..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700 font-medium"
                    >
                      {member.position || "—"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={member.status === "present" ? "default" : "secondary"}
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
                              onClick={() => onEditStaff(member)}
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
                              onClick={() => onDeleteClick(member.id, member.name)}
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
                {searchTerm
                  ? "Try adjusting your search criteria."
                  : "Add your first staff member to get started."}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Edit Dialog */}
      <EditStaffDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        formData={editStaffForm}
        onFormChange={setEditStaffForm}
        onSubmit={onUpdateStaff}
      />
    </div>
  );
}
