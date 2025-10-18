import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Plus, Eye, EyeOff } from "lucide-react";
import type { NewStudentForm } from "../../types/admin.types";

interface AddStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: NewStudentForm;
  onFormChange: (data: NewStudentForm) => void;
  onSubmit: () => void;
}

export function AddStudentDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
}: AddStudentDialogProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
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
              value={formData.email}
              onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
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
              value={formData.department}
              onChange={(e) => onFormChange({ ...formData, department: e.target.value })}
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
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => onFormChange({ ...formData, password: e.target.value })}
                placeholder="Default password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            Add Student
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
