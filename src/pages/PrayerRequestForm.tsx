import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RichTextEditor } from './RichTextEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, AlertCircle, BookMarked, PenLine, LoaderCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import {Member, MemberSelect} from "@/pages/MemberSelect";
import {PrayerRequest} from "@/pages/PrayerRequests.tsx";

interface PrayerRequestFormData {
  title: string;
  description: string;
  category: string;
  is_permanent: boolean;
  status: string;
  member_ids: string[];
}

const defaultFormData: PrayerRequestFormData = {
  title: '',
  description: '',
  category: 'other',
  is_permanent: false,
  status: 'active',
  member_ids: []
};

interface PrayerRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: PrayerRequest;
  onSubmit: (data: PrayerRequestFormData) => Promise<void>;
  isEditing?: boolean;
  currentUserId: string;
}

interface FormErrors {
  title?: string;
  description?: string;
  category?: string;
  submit?: string;
}

const MAX_TITLE_LENGTH = 100;
const MAX_DESCRIPTION_LENGTH = 1000;
const MIN_TITLE_LENGTH = 3;
const MIN_DESCRIPTION_LENGTH = 10;
const AUTO_SAVE_DELAY = 2000; // 2 seconds

const categories = [
  { value: 'health', label: 'Health' },
  { value: 'family', label: 'Family' },
  { value: 'spiritual', label: 'Spiritual' },
  { value: 'financial', label: 'Financial' },
  { value: 'other', label: 'Other' }
];

export function PrayerRequestForm({
                                    open,
                                    onOpenChange,
                                    initialData,
                                    onSubmit,
                                    isEditing = false,
                                    currentUserId
                                  }: PrayerRequestFormProps) {
  const [formData, setFormData] = useState<PrayerRequestFormData>(defaultFormData);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_, setMembers] = useState<Member[]>([]);
  const [existingMembers, setExistingMembers] = useState<string[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [originalFormData, setOriginalFormData] = useState<PrayerRequestFormData>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saving' | 'saved' | 'error' | null>(null);
  const [fetchMembersError, setFetchMembersError] = useState<string | null>(null);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedRef = useRef<string>('');

  // Character count progress calculations
  const titleProgress = (formData.title.length / MAX_TITLE_LENGTH) * 100;

  // Fetch existing members for the prayer request when editing
  useEffect(() => {
    async function fetchExistingMembers() {
      if (!isEditing || !currentUserId) return;

      try {
        const { data, error } = await supabase
            .from('prayer_request_members')
            .select('member_id')
            .eq('prayer_request_id', currentUserId);

        if (error) throw error;

        setExistingMembers(data?.map(m => m.member_id) || []);
      } catch (error) {
        console.error('Error fetching existing members:', error);
      }
    }

    fetchExistingMembers();
  }, [isEditing, currentUserId]);

  // Populate form data when editing
  useEffect(() => {
    if (initialData) {
      const preparedData = {
        ...initialData,
        member_ids: existingMembers
      };
      setFormData(preparedData);
      setOriginalFormData(preparedData);
      lastSavedRef.current = JSON.stringify(preparedData);
    }
  }, [initialData, existingMembers]);

  // Fetch members with more robust error handling
  useEffect(() => {
    async function fetchMembers() {
      try {
        setLoadingMembers(true);
        setFetchMembersError(null);

        const { data, error } = await supabase
            .from('members')
            .select('id, first_name, last_name, role, ministry')
            .order('first_name');

        if (error) {
          throw new Error(error.message || 'Failed to fetch members');
        }

        setMembers(data || []);
      } catch (error) {
        console.error('Error fetching members:', error);
        setFetchMembersError(error instanceof Error ? error.message : 'An unknown error occurred');
      } finally {
        setLoadingMembers(false);
      }
    }

    if (open) {
      fetchMembers();
    }
  }, [open]);

  const autoSave = useCallback(async () => {
    const currentData = JSON.stringify(formData);
    if (currentData !== lastSavedRef.current && isEditing) {
      try {
        setAutoSaveStatus('saving');
        await onSubmit(formData);
        lastSavedRef.current = currentData;
        setAutoSaveStatus('saved');
      } catch (error) {
        setAutoSaveStatus('error');
        console.error('Auto-save failed:', error);
      }
    }
  }, [formData, isEditing, onSubmit]);

  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    if (isEditing && hasUnsavedChanges()) {
      autoSaveTimeoutRef.current = setTimeout(autoSave, AUTO_SAVE_DELAY);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [formData, isEditing, autoSave]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < MIN_TITLE_LENGTH) {
      newErrors.title = `Title must be at least ${MIN_TITLE_LENGTH} characters`;
    } else if (formData.title.length > MAX_TITLE_LENGTH) {
      newErrors.title = `Title must be less than ${MAX_TITLE_LENGTH} characters`;
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length < MIN_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`;
    } else if (formData.description.length > MAX_DESCRIPTION_LENGTH) {
      newErrors.description = `Description must be less than ${MAX_DESCRIPTION_LENGTH} characters`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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

  const updatePrayerRequest = async () => {
    if (!currentUserId) throw new Error('No prayer request ID');

    // Update prayer request details
    const { error: updateError } = await supabase
        .from('prayer_requests')
        .update({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          is_permanent: formData.is_permanent,
          status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id',currentUserId);

    if (updateError) throw updateError;

    // Update associated members
    // First, remove existing associations
    const { error: deleteError } = await supabase
        .from('prayer_request_members')
        .delete()
        .eq('prayer_request_id', currentUserId);

    if (deleteError) throw deleteError;

    // Then add new member associations if any
    if (formData.member_ids.length > 0) {
      const memberAssociations = formData.member_ids.map(memberId => ({
        prayer_request_id: currentUserId,
        member_id: memberId
      }));

      const { error: insertError } = await supabase
          .from('prayer_request_members')
          .insert(memberAssociations);

      if (insertError) throw insertError;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      if (isEditing) {
        await updatePrayerRequest();
      } else {
        // Create new prayer request
        const { data: prayerRequest, error: prayerError } = await supabase
            .from('prayer_requests')
            .insert([{
              title: formData.title,
              description: formData.description,
              category: formData.category,
              is_permanent: formData.is_permanent,
              status: formData.status,
              creator_id: currentUserId
            }])
            .select()
            .single();

        if (prayerError) {
          throw new Error(prayerError.message || 'Failed to create prayer request');
        }

        // Create member associations for new request
        if (formData.member_ids.length > 0) {
          const memberAssociations = formData.member_ids.map(memberId => ({
            prayer_request_id: prayerRequest?.id,
            member_id: memberId
          }));

          const { error: memberError } = await supabase
              .from('prayer_request_members')
              .insert(memberAssociations);

          if (memberError) {
            throw new Error(memberError.message || 'Failed to associate members');
          }
        }
      }

      onOpenChange(false);
      if (!isEditing) {
        setFormData(defaultFormData);
      }
    } catch (error) {
      console.error('Error submitting:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to save prayer request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
      <>
        <Dialog open={open} onOpenChange={handleCancel}>
          <DialogContent className="sm:max-w-[525px] p-6">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
                {isEditing ? (
                    <>
                      <PenLine className="w-6 h-6 text-muted-foreground" />
                      Edit Prayer Request
                    </>
                ) : (
                    <>
                      <BookMarked className="w-6 h-6 text-muted-foreground" />
                      New Prayer Request
                    </>
                )}
              </DialogTitle>
              <DialogDescription>
                {isEditing
                    ? "Update the details of your prayer request."
                    : "Share your prayer request with the church community."}
              </DialogDescription>
            </DialogHeader>

            {submitError && (
                <Alert variant="destructive" className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
            )}

            {autoSaveStatus && (
                <div className="text-sm text-muted-foreground mt-2">
                  {autoSaveStatus === 'saving' && 'Saving...'}
                  {autoSaveStatus === 'saved' && 'All changes saved'}
                  {autoSaveStatus === 'error' && 'Error saving changes'}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <span className="text-xs text-muted-foreground">
                  {formData.title.length}/{MAX_TITLE_LENGTH}
                </span>
                </div>
                <Input
                    id="title"
                    required
                    value={formData.title}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_TITLE_LENGTH) {
                        setFormData({...formData, title: e.target.value});
                        if (errors.title) {
                          setErrors({...errors, title: undefined});
                        }
                      }
                    }}
                    placeholder="Enter a title for your prayer request"
                    className={errors.title ? "border-destructive" : "bg-background"}
                />
                <Progress value={titleProgress} className="h-1"/>
                {errors.title && (
                    <p className="text-sm text-destructive">{errors.title}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description <span className="text-destructive">*</span>
                  </Label>
                </div>
                <RichTextEditor
                    content={formData.description}
                    onChange={(content) => {
                      const plainText = content.replace(/<[^>]*>/g, '').trim();
                      setFormData({...formData, description: plainText});
                      if (errors.description) {
                        const newErrors = {...errors};
                        delete newErrors.description;
                        setErrors(newErrors);
                      }
                    }}
                    placeholder="Describe your prayer request"
                    maxLength={MAX_DESCRIPTION_LENGTH}
                    error={!!errors.description}
                />
                {errors.description && (
                    <p className="text-sm text-destructive">{errors.description}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="members">Members</Label>
                {loadingMembers ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Loading members...
                    </div>
                ) : fetchMembersError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{fetchMembersError}</AlertDescription>
                    </Alert>
                ) : (
                    <>
                      <MemberSelect
                          currentMembers={existingMembers}
                          selectedMembers={formData.member_ids}
                          onChange={(values) => setFormData({...formData, member_ids: values})}
                          maxSelections={5}
                      />
                      <p className="text-sm text-muted-foreground">
                        Select the members this prayer request is for
                      </p>
                    </>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">Category</Label>
                <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({...formData, category: value})}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a category"/>
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                    id="is_permanent"
                    checked={formData.is_permanent}
                    onCheckedChange={(checked) =>
                        setFormData({...formData, is_permanent: checked as boolean})
                    }
                />
                <Label htmlFor="is_permanent" className="text-sm font-medium">
                  Permanent Prayer Request
                </Label>
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
                        <Loader2 className="w-4 h-4 mr-2 animate-spin"/>
                        {isEditing ? 'Updating...' : 'Submitting...'}
                      </>
                  ) : (
                      <>
                        {isEditing ? 'Update Request' : 'Submit Request'}
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
                You have unsaved changes to your prayer request. Are you sure you want to discard them?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continue Editing</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                setShowConfirmDialog(false);
                setFormData(originalFormData);
                onOpenChange(false);
              }}>
                Discard Changes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
  );
}