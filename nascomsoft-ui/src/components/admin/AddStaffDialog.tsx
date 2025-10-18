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
import type { NewStaffForm } from "../../types/admin.types";

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: NewStaffForm;
  onFormChange: (data: NewStaffForm) => void;
  onSubmit: () => void;
}

export function AddStaffDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
}: AddStaffDialogProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
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
              value={formData.email}
              onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
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
              value={formData.position}
              onChange={(e) => onFormChange({ ...formData, position: e.target.value })}
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
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
          >
            Add Staff Member
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
