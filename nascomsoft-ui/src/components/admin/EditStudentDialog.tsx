import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { EditStudentForm } from "../../types/admin.types";

interface EditStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: EditStudentForm;
  onFormChange: (data: EditStudentForm) => void;
  onSubmit: () => void;
}

export function EditStudentDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
}: EditStudentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            Edit Student
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Update the student details below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label
              htmlFor="edit-student-name"
              className="text-sm font-semibold text-gray-700"
            >
              Name
            </Label>
            <Input
              id="edit-student-name"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              placeholder="Student name"
              className="mt-1 border-gray-300"
            />
          </div>
          <div>
            <Label
              htmlFor="edit-student-email"
              className="text-sm font-semibold text-gray-700"
            >
              Email
            </Label>
            <Input
              id="edit-student-email"
              type="email"
              value={formData.email}
              onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
              placeholder="student@nascomsoft.com"
              className="mt-1 border-gray-300"
            />
          </div>
          <div>
            <Label
              htmlFor="edit-student-department"
              className="text-sm font-semibold text-gray-700"
            >
              Department
            </Label>
            <Input
              id="edit-student-department"
              value={formData.department}
              onChange={(e) => onFormChange({ ...formData, department: e.target.value })}
              placeholder="Computer Science"
              className="mt-1 border-gray-300"
            />
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
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
