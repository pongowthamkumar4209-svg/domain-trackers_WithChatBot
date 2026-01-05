import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Clarification, COLUMN_LABELS } from '@/types/clarification';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const clarificationSchema = z.object({
  s_no: z.number().nullable().optional(),
  module: z.string().min(1, 'Module is required').max(100),
  scenario_steps: z.string().max(5000),
  status: z.string().max(50),
  offshore_comments: z.string().max(5000),
  onsite_comments: z.string().max(5000),
  date: z.string(),
  teater: z.string().max(100),
  offshore_reviewer: z.string().max(100),
  open: z.string().max(50),
  addressed_by: z.string().max(100),
  defect_should_be_raised: z.string().max(100),
  priority: z.string().max(50),
  assigned_to: z.string().max(100),
  reason: z.string().max(5000),
});

type ClarificationFormData = z.infer<typeof clarificationSchema>;

interface ClarificationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clarification?: Clarification | null;
  onSave: (data: Partial<Clarification>) => Promise<{ success: boolean; error?: string }>;
  filterOptions: {
    statuses: string[];
    priorities: string[];
    modules: string[];
    assignees: string[];
  };
}

export function ClarificationForm({ 
  open, 
  onOpenChange, 
  clarification, 
  onSave,
  filterOptions 
}: ClarificationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const isEdit = !!clarification;

  const form = useForm<ClarificationFormData>({
    resolver: zodResolver(clarificationSchema),
    defaultValues: clarification ? {
      s_no: clarification.s_no,
      module: clarification.module,
      scenario_steps: clarification.scenario_steps,
      status: clarification.status,
      offshore_comments: clarification.offshore_comments,
      onsite_comments: clarification.onsite_comments,
      date: clarification.date ? clarification.date.split('T')[0] : '',
      teater: clarification.teater,
      offshore_reviewer: clarification.offshore_reviewer,
      open: clarification.open,
      addressed_by: clarification.addressed_by,
      defect_should_be_raised: clarification.defect_should_be_raised,
      priority: clarification.priority,
      assigned_to: clarification.assigned_to,
      reason: clarification.reason,
    } : {
      s_no: null,
      module: '',
      scenario_steps: '',
      status: '',
      offshore_comments: '',
      onsite_comments: '',
      date: new Date().toISOString().split('T')[0],
      teater: '',
      offshore_reviewer: '',
      open: '',
      addressed_by: '',
      defect_should_be_raised: '',
      priority: '',
      assigned_to: '',
      reason: '',
    },
  });

  const onSubmit = async (data: ClarificationFormData) => {
    setIsSubmitting(true);
    try {
      const result = await onSave({
        ...data,
        id: clarification?.id,
        date: data.date ? new Date(data.date).toISOString() : '',
      });

      if (result.success) {
        toast({
          title: isEdit ? 'Row updated' : 'Row created',
          description: isEdit ? 'Clarification updated successfully.' : 'New clarification added.',
        });
        onOpenChange(false);
        form.reset();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to save clarification',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSelectWithCustom = (
    field: any,
    options: string[],
    placeholder: string
  ) => (
    <Select
      value={field.value || ''}
      onValueChange={field.onChange}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {opt}
          </SelectItem>
        ))}
        {field.value && !options.includes(field.value) && (
          <SelectItem value={field.value}>{field.value} (custom)</SelectItem>
        )}
      </SelectContent>
    </Select>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Clarification' : 'Add New Clarification'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="s_no"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{COLUMN_LABELS.s_no}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="module"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{COLUMN_LABELS.module} *</FormLabel>
                        <FormControl>
                          {filterOptions.modules.length > 0 ? (
                            renderSelectWithCustom(field, filterOptions.modules, 'Select module')
                          ) : (
                            <Input {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="scenario_steps"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{COLUMN_LABELS.scenario_steps}</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-24" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{COLUMN_LABELS.status}</FormLabel>
                        <FormControl>
                          {filterOptions.statuses.length > 0 ? (
                            renderSelectWithCustom(field, filterOptions.statuses, 'Select status')
                          ) : (
                            <Input {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{COLUMN_LABELS.priority}</FormLabel>
                        <FormControl>
                          {filterOptions.priorities.length > 0 ? (
                            renderSelectWithCustom(field, filterOptions.priorities, 'Select priority')
                          ) : (
                            <Input {...field} />
                          )}
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="open"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{COLUMN_LABELS.open}</FormLabel>
                        <FormControl>
                          <Select value={field.value || ''} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Open">Open</SelectItem>
                              <SelectItem value="Closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="assigned_to"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{COLUMN_LABELS.assigned_to}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Enter assignee name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{COLUMN_LABELS.date}</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="offshore_comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{COLUMN_LABELS.offshore_comments}</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-20" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="onsite_comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{COLUMN_LABELS.onsite_comments}</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-20" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{COLUMN_LABELS.reason}</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="min-h-20" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="addressed_by"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{COLUMN_LABELS.addressed_by}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="teater"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{COLUMN_LABELS.teater}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="offshore_reviewer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{COLUMN_LABELS.offshore_reviewer}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="defect_should_be_raised"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{COLUMN_LABELS.defect_should_be_raised}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
