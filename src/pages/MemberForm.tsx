import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, UserCog, Loader2, AlertCircle } from "lucide-react";

interface MemberFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: unknown) => Promise<void>;
  initialData?: unknown;
  isEditing?: boolean;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  role?: string;
  attendance_status?: string;
  submit?: string;
}

const defaultFormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'member',
  ministry: [],
  attendance_status: 'active'
};

export function MemberForm({
                             open,
                             onOpenChange,
                             onSubmit,
                             initialData,
                             isEditing = false
                           }: MemberFormProps) {
  const [formData, setFormData] = useState(defaultFormData);
  const [originalFormData, setOriginalFormData] = useState(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      setOriginalFormData(initialData);
    } else {
      setFormData(defaultFormData);
      setOriginalFormData(defaultFormData);
    }
  }, [initialData]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    } else if (formData.first_name.length < 2) {
      newErrors.first_name = 'First name must be at least 2 characters';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    } else if (formData.last_name.length < 2) {
      newErrors.last_name = 'Last name must be at least 2 characters';
    }

    // Email validation
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (formData.phone && !/^\+?[\d\s-]{10,}$/.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      await onSubmit(formData);
      if (!isEditing) {
        setFormData(defaultFormData);
      }
      setOriginalFormData(formData);
    } catch (error) {
      console.error('Error submitting:', error);
      setSubmitError('Failed to save member. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasUnsavedChanges = (): boolean => {
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      setShowConfirmDialog(true);
    } else {
      onOpenChange(false);
    }
  };

  const handleConfirmCancel = () => {
    setShowConfirmDialog(false);
    setFormData(originalFormData);
    onOpenChange(false);
  };

  return (
      <>
        <Dialog open={open} onOpenChange={handleCancel}>
          <DialogContent className="sm:max-w-[525px] p-6">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
                {isEditing ? (
                    <>
                      <UserCog className="w-6 h-6 text-muted-foreground" />
                      Edit Member
                    </>
                ) : (
                    <>
                      <UserPlus className="w-6 h-6 text-muted-foreground" />
                      Add New Member
                    </>
                )}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                    ? "Update the member's information below."
                    : "Fill in the information to add a new church member."}
              </DialogDescription>
            </DialogHeader>

            {submitError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-sm font-medium">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => {
                        setFormData({ ...formData, first_name: e.target.value });
                        if (errors.first_name) {
                          setErrors({ ...errors, first_name: undefined });
                        }
                      }}
                      placeholder="First name"
                      className={errors.first_name ? "border-destructive" : "bg-background"}
                      required
                  />
                  {errors.first_name && (
                      <p className="text-sm text-destructive">{errors.first_name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name" className="text-sm font-medium">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => {
                        setFormData({ ...formData, last_name: e.target.value });
                        if (errors.last_name) {
                          setErrors({ ...errors, last_name: undefined });
                        }
                      }}
                      placeholder="Last name"
                      className={errors.last_name ? "border-destructive" : "bg-background"}
                      required
                  />
                  {errors.last_name && (
                      <p className="text-sm text-destructive">{errors.last_name}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errors.email) {
                        setErrors({ ...errors, email: undefined });
                      }
                    }}
                    placeholder="Email address"
                    className={errors.email ? "border-destructive" : "bg-background"}
                />
                {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  Phone
                </Label>
                <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => {
                      setFormData({ ...formData, phone: e.target.value });
                      if (errors.phone) {
                        setErrors({ ...errors, phone: undefined });
                      }
                    }}
                    placeholder="Phone number"
                    className={errors.phone ? "border-destructive" : "bg-background"}
                />
                {errors.phone && (
                    <p className="text-sm text-destructive">{errors.phone}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-sm font-medium">
                    Role
                  </Label>
                  <Select
                      value={formData.role}
                      onValueChange={(value) => setFormData({ ...formData, role: value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status
                  </Label>
                  <Select
                      value={formData.attendance_status}
                      onValueChange={(value) => setFormData({ ...formData, attendance_status: value })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="visitor">Visitor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={loading}
                    className="bg-background"
                >
                  Cancel
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                    className="bg-primary hover:bg-primary/90"
                >
                  {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {isEditing ? 'Updating...' : 'Adding...'}
                      </>
                  ) : (
                      <>
                        {isEditing ? 'Update Member' : 'Add Member'}
                      </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Discard Changes?</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. Are you sure you want to discard them?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue Editing</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmCancel}>
                Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
  );
}