"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  DEPARTMENT_OPTIONS,
  SECTION_OPTIONS,
  departmentRequiresSection,
  type Department,
} from "@/lib/departments";
import toast from "react-hot-toast";

interface EditTargetClassDialogProps {
  assignmentId: string;
  targetDepartment: string | null;
  targetSection: string | null;
}

export function EditTargetClassDialog({
  assignmentId,
  targetDepartment,
  targetSection,
}: EditTargetClassDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [department, setDepartment] = useState(targetDepartment ?? "");
  const [section, setSection] = useState(targetSection ?? "");

  const requiresSection = departmentRequiresSection(department as Department);

  const resetStateFromProps = () => {
    setDepartment(targetDepartment ?? "");
    setSection(targetSection ?? "");
  };

  const handleSave = async () => {
    if (!department) {
      toast.error("Please select target department");
      return;
    }

    if (requiresSection && !section) {
      toast.error("Please select target section");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(`/api/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetDepartment: department,
          targetSection: requiresSection ? section : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update target class");
      }

      toast.success("Target class updated successfully");
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update target class"
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetStateFromProps();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4 mr-2" />
          Edit Target Class
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Target Class</DialogTitle>
          <DialogDescription>
            Update the department and section who can view this assignment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="targetDepartment">Target Department</Label>
            <Select
              value={department}
              onValueChange={(value) => {
                setDepartment(value);
                if (!departmentRequiresSection(value as Department)) {
                  setSection("");
                }
              }}
              disabled={saving}
            >
              <SelectTrigger id="targetDepartment">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requiresSection && (
            <div className="space-y-2">
              <Label htmlFor="targetSection">Target Section</Label>
              <Select
                value={section}
                onValueChange={setSection}
                disabled={saving}
              >
                <SelectTrigger id="targetSection">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_OPTIONS.map((item) => (
                    <SelectItem key={item} value={item}>
                      Section {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
