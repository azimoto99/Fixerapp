import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Plus,
  Trash2,
  CalendarClock,
  GripVertical,
  MapPin,
  DollarSign,
  ArrowUpDown,
  PlusCircle,
  Edit,
  Save,
  X,
  HelpCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Task form schema with additional validation
const taskFormSchema = z.object({
  jobId: z.number(),
  description: z.string().min(3, "Task description is required"),
  position: z.number(),
  isOptional: z.boolean().default(false),
  isCompleted: z.boolean().default(false),
  dueTime: z.union([z.string(), z.date(), z.null()]).optional(),
  estimatedDuration: z.number().min(5, "Minimum 5 minutes").max(480, "Maximum 8 hours").optional(),
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  bonusAmount: z.number().min(0, "Bonus amount cannot be negative").optional(),
  notes: z.string().optional(),
});

// Infer the types from the schema
type TaskFormValues = z.infer<typeof taskFormSchema>;
type Task = any; // Replace with actual Task type when available

interface TaskManagerProps {
  jobId: number;
  editable?: boolean; // Controls if tasks can be added/edited
  onComplete?: (completedTaskIds: number[]) => void;
}

export default function TaskManager({ jobId, editable = false, onComplete }: TaskManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [openTaskForm, setOpenTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<number | null>(null);
  
  // Default form values
  const defaultValues: Partial<TaskFormValues> = {
    jobId,
    description: '',
    position: 0,
    isOptional: false,
    bonusAmount: 0,
    estimatedDuration: 30, // Default to 30 minutes
    notes: '',
  };
  
  // Form setup
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,
  });
  
  // Reset form when opening/closing
  useEffect(() => {
    if (!openTaskForm) {
      form.reset(defaultValues);
      setEditingTask(null);
    }
  }, [openTaskForm, form]);
  
  // Set form values when editing a task
  useEffect(() => {
    if (editingTask) {
      form.reset({
        jobId,
        description: editingTask.description,
        position: editingTask.position,
        isOptional: editingTask.isOptional,
        dueTime: editingTask.dueTime,
        estimatedDuration: editingTask.estimatedDuration || 30,
        location: editingTask.location || '',
        latitude: editingTask.latitude,
        longitude: editingTask.longitude,
        bonusAmount: editingTask.bonusAmount || 0,
        notes: editingTask.notes || '',
      });
      setOpenTaskForm(true);
    }
  }, [editingTask, form, jobId]);
  
  // Fetch tasks for the job
  const {
    data: tasks,
    isLoading,
    error,
    refetch: refetchTasks
  } = useQuery({
    queryKey: ['/api/tasks/job', jobId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/tasks/job/${jobId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return response.json();
    },
    enabled: !!jobId,
  });
  
  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      const response = await apiRequest('POST', '/api/tasks', data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/job', jobId] });
      setOpenTaskForm(false);
      toast({
        title: 'Task Created',
        description: 'Task has been added to the job',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create task: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<TaskFormValues> }) => {
      const response = await apiRequest('PATCH', `/api/tasks/${id}`, data);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/job', jobId] });
      setOpenTaskForm(false);
      toast({
        title: 'Task Updated',
        description: 'Task has been updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update task: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest('DELETE', `/api/tasks/${taskId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/job', jobId] });
      toast({
        title: 'Task Deleted',
        description: 'Task has been removed from the job',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to delete task: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      const response = await apiRequest('POST', `/api/tasks/${taskId}/complete`, {});
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete task');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/job', jobId] });
      toast({
        title: 'Task Completed',
        description: 'Task has been marked as completed',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to complete task: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Reorder tasks mutation
  const reorderTasksMutation = useMutation({
    mutationFn: async (taskIds: number[]) => {
      const response = await apiRequest('POST', `/api/tasks/job/${jobId}/reorder`, { taskIds });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reorder tasks');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/job', jobId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to reorder tasks: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Submit task form
  const onSubmit = (data: TaskFormValues) => {
    // Format date if needed
    if (data.dueTime && typeof data.dueTime === 'string') {
      data.dueTime = new Date(data.dueTime);
    }
    
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data });
    } else {
      // Set position to the end of the list if not provided
      if (!data.position && tasks && tasks.length > 0) {
        data.position = tasks.length;
      }
      createTaskMutation.mutate(data);
    }
  };
  
  // Handle drag and drop
  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('taskId', taskId.toString());
    setDraggingTaskId(taskId);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDrop = (e: React.DragEvent, targetTaskId: number) => {
    e.preventDefault();
    const draggedTaskId = Number(e.dataTransfer.getData('taskId'));
    setDraggingTaskId(null);
    
    if (draggedTaskId === targetTaskId) return;
    
    // Find the positions of the dragged and target tasks
    const draggedTask = tasks.find((t: Task) => t.id === draggedTaskId);
    const targetTask = tasks.find((t: Task) => t.id === targetTaskId);
    
    if (!draggedTask || !targetTask) return;
    
    // Create a copy of the tasks array and swap the positions
    const newTasks = [...tasks].sort((a, b) => a.position - b.position);
    const draggedIndex = newTasks.findIndex((t: Task) => t.id === draggedTaskId);
    const targetIndex = newTasks.findIndex((t: Task) => t.id === targetTaskId);
    
    // Remove the dragged task from the array
    const [removed] = newTasks.splice(draggedIndex, 1);
    // Insert it at the target position
    newTasks.splice(targetIndex, 0, removed);
    
    // Update positions
    const updatedTaskIds = newTasks.map((task: Task) => task.id);
    reorderTasksMutation.mutate(updatedTaskIds);
  };
  
  // Task completion handler
  const handleCompleteTask = (taskId: number) => {
    completeTaskMutation.mutate(taskId);
  };
  
  // Task deletion handler
  const handleDeleteTask = (taskId: number) => {
    deleteTaskMutation.mutate(taskId);
  };
  
  // Edit task handler
  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };
  
  // Check if all tasks are completed
  const allTasksCompleted = tasks && tasks.length > 0 && tasks.every((task: Task) => task.isCompleted);
  
  // Calculate progress
  const completedTaskCount = tasks ? tasks.filter((task: Task) => task.isCompleted).length : 0;
  const totalTaskCount = tasks ? tasks.length : 0;
  const completionPercentage = totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;
  
  // Group tasks by completion status
  const completedTasks = tasks ? tasks.filter((task: Task) => task.isCompleted) : [];
  const pendingTasks = tasks ? tasks.filter((task: Task) => !task.isCompleted) : [];
  
  // Sort tasks by position
  const sortedPendingTasks = [...(pendingTasks || [])].sort((a, b) => a.position - b.position);
  const sortedCompletedTasks = [...(completedTasks || [])].sort((a, b) => a.position - b.position);
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Task List</CardTitle>
              <CardDescription>
                {totalTaskCount > 0 
                  ? `${completedTaskCount} of ${totalTaskCount} tasks completed (${completionPercentage}%)`
                  : 'No tasks defined for this job'}
              </CardDescription>
            </div>
            
            {editable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpenTaskForm(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-center py-4 text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Failed to load tasks</p>
            </div>
          ) : totalTaskCount === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">
                No tasks have been added to this job yet
                {editable && '. Click "Add Task" to create your first task.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Pending Tasks */}
              {sortedPendingTasks.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Pending Tasks</h3>
                  <div className="space-y-2">
                    {sortedPendingTasks.map((task: Task) => (
                      <div
                        key={task.id}
                        className={`border rounded-md p-3 ${draggingTaskId === task.id ? 'border-primary bg-primary/5' : 'bg-card'}`}
                        draggable={editable}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, task.id)}
                      >
                        <div className="flex items-start gap-2">
                          {editable ? (
                            <GripVertical className="h-5 w-5 text-muted-foreground cursor-move mt-0.5" />
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="rounded-full p-0 h-6 w-6"
                              onClick={() => handleCompleteTask(task.id)}
                            >
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            </Button>
                          )}
                          
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium">{task.description}</p>
                                
                                {/* Task Metadata */}
                                <div className="flex flex-wrap gap-2 mt-1">
                                  {task.dueTime && (
                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {format(new Date(task.dueTime), 'MMM d, h:mm a')}
                                    </Badge>
                                  )}
                                  
                                  {task.location && (
                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {task.location}
                                    </Badge>
                                  )}
                                  
                                  {task.isOptional && (
                                    <Badge variant="secondary" className="text-xs">
                                      Optional
                                    </Badge>
                                  )}
                                  
                                  {task.bonusAmount > 0 && (
                                    <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300">
                                      <DollarSign className="h-3 w-3" />
                                      ${task.bonusAmount.toFixed(2)} Bonus
                                    </Badge>
                                  )}
                                  
                                  {task.estimatedDuration > 0 && (
                                    <Badge variant="outline" className="text-xs flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {task.estimatedDuration} min
                                    </Badge>
                                  )}
                                </div>
                                
                                {task.notes && (
                                  <div className="mt-2 text-sm text-muted-foreground border-l-2 border-muted pl-3 py-1">
                                    {task.notes}
                                  </div>
                                )}
                              </div>
                              
                              {editable && (
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleEditTask(task)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive"
                                    onClick={() => handleDeleteTask(task.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Completed Tasks */}
              {sortedCompletedTasks.length > 0 && (
                <Accordion type="single" collapsible defaultValue="completed">
                  <AccordionItem value="completed" className="border-none">
                    <AccordionTrigger className="py-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Completed Tasks ({sortedCompletedTasks.length})
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-2 opacity-70">
                        {sortedCompletedTasks.map((task: Task) => (
                          <div key={task.id} className="border rounded-md p-3 bg-muted/30">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                              
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-medium line-through">{task.description}</p>
                                    
                                    {/* Completed Metadata */}
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {task.completedAt && (
                                        <Badge variant="outline" className="text-xs flex items-center gap-1 opacity-70">
                                          <CalendarClock className="h-3 w-3" />
                                          Completed: {format(new Date(task.completedAt), 'MMM d, h:mm a')}
                                        </Badge>
                                      )}
                                      
                                      {task.isOptional && (
                                        <Badge variant="secondary" className="text-xs opacity-70">
                                          Optional
                                        </Badge>
                                      )}
                                      
                                      {task.bonusAmount > 0 && (
                                        <Badge variant="secondary" className="text-xs flex items-center gap-1 opacity-70">
                                          <DollarSign className="h-3 w-3" />
                                          ${task.bonusAmount.toFixed(2)} Bonus
                                        </Badge>
                                      )}
                                      
                                      {task.estimatedDuration > 0 && (
                                        <Badge variant="outline" className="text-xs flex items-center gap-1 opacity-70">
                                          <Clock className="h-3 w-3" />
                                          {task.estimatedDuration} min
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {task.notes && (
                                      <div className="mt-2 text-sm text-muted-foreground border-l-2 border-muted pl-3 py-1 opacity-70 line-through">
                                        {task.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          )}
        </CardContent>
        
        {/* Show complete all tasks button for workers */}
        {!editable && totalTaskCount > 0 && completedTaskCount < totalTaskCount && onComplete && (
          <CardFooter className="flex justify-end pt-0">
            <Button
              variant="default"
              onClick={() => onComplete(pendingTasks.map((t: Task) => t.id))}
              disabled={isLoading || completeTaskMutation.isPending}
            >
              {completeTaskMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Mark All Tasks Complete'
              )}
            </Button>
          </CardFooter>
        )}
      </Card>
      
      {/* Task Form Dialog */}
      <Dialog open={openTaskForm} onOpenChange={setOpenTaskForm}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
            <DialogDescription>
              {editingTask 
                ? 'Update the details for this task' 
                : 'Create a new task for this job'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter task description"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="isOptional"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Optional Task</FormLabel>
                        <FormDescription>
                          Mark this task as optional
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="bonusAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bonus Amount ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Optional bonus for completing this task
                      </FormDescription>
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="dueTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date & Time</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local"
                        {...field}
                        value={field.value ? new Date(field.value).toISOString().slice(0, 16) : ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormDescription>
                      When this task should be completed by
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location (Optional)</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Enter specific location for this task"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Specific location for this task, if different from the job location
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="estimatedDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="5"
                        max="480"
                        placeholder="30"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 30)}
                      />
                    </FormControl>
                    <FormDescription>
                      Approximate time needed to complete this task (5-480 minutes)
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter any additional notes or instructions for this task"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional detailed instructions or notes for the worker
                    </FormDescription>
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenTaskForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={form.formState.isSubmitting || createTaskMutation.isPending || updateTaskMutation.isPending}
                >
                  {form.formState.isSubmitting || createTaskMutation.isPending || updateTaskMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingTask ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>{editingTask ? 'Update Task' : 'Add Task'}</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}