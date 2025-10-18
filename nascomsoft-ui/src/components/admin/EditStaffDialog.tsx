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
import type { EditStaffForm } from "../../types/admin.types";

interface EditStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: EditStaffForm;
  onFormChange: (data: EditStaffForm) => void;
  onSubmit: () => void;
}

export function EditStaffDialog({
  open,
  onOpenChange,
  formData,
  onFormChange,
  onSubmit,
}: EditStaffDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-800">
            Edit Staff Member
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Update the staff member details below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label
              htmlFor="edit-staff-name"
              className="text-sm font-semibold text-gray-700"
            >
              Name
            </Label>
            <Input
              id="edit-staff-name"
              value={formData.name}
              onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
              placeholder="Staff name"
              className="mt-1 border-gray-300"
            />
          </div>
          <div>
            <Label
              htmlFor="edit-staff-email"
              className="text-sm font-semibold text-gray-700"
            >
              Email
            </Label>
            <Input
              id="edit-staff-email"
              type="email"
              value={formData.email}
              onChange={(e) => onFormChange({ ...formData, email: e.target.value })}
              placeholder="staff@nascomsoft.com"
              className="mt-1 border-gray-300"
            />
          </div>
          <div>
            <Label
              htmlFor="edit-staff-position"
              className="text-sm font-semibold text-gray-700"
            >
              Position
            </Label>
            <Input
              id="edit-staff-position"
              value={formData.position}
              onChange={(e) => onFormChange({ ...formData, position: e.target.value })}
              placeholder="Senior Developer"
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
            className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
