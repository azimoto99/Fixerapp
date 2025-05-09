import React, { useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Loader2, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Grip, 
  Check,
  ClipboardList,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';

interface TaskManagerProps {
  jobId: number;
  mode?: 'poster' | 'worker';
  className?: string;
  compact?: boolean;
}

// Task form schema
const taskFormSchema = z.object({
  description: z.string()
    .min(5, 'Task description must be at least 5 characters')
    .max(200, 'Task description cannot exceed 200 characters'),
  position: z.number().optional(),
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

const TaskManager: React.FC<TaskManagerProps> = ({
  jobId,
  mode,
  className = '',
  compact = false,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addTaskDialogOpen, setAddTaskDialogOpen] = useState(false);
  const userMode = mode || (user?.accountType === 'worker' ? 'worker' : 'poster');

  // Fetch job to determine if user is poster or worker
  const { data: job, isLoading: isLoadingJob } = useQuery({
    queryKey: ['/api/jobs', jobId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/jobs/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch job');
      return res.json();
    },
  });

  // Fetch tasks for job
  const { data: tasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['/api/tasks/job', jobId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/tasks/job/${jobId}`);
      if (!res.ok) throw new Error('Failed to fetch tasks');
      return res.json();
    },
  });

  // Determine if user is poster or worker for this specific job
  const isPoster = job ? job.posterId === user?.id : false;
  const isWorker = job ? job.workerId === user?.id : false;
  const canEditTasks = isPoster;
  const canCompleteTasks = isWorker;

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormValues) => {
      const taskData = {
        ...data,
        jobId,
        position: data.position || (tasks ? tasks.length : 0),
      };
      
      const res = await apiRequest('POST', '/api/tasks', taskData);
      if (!res.ok) throw new Error('Failed to create task');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Task Created',
        description: 'New task has been added to the job.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/job', jobId] });
      setAddTaskDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to create task: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: async ({ taskId, isCompleted }: { taskId: number, isCompleted: boolean }) => {
      const res = await apiRequest('PATCH', `/api/tasks/${taskId}`, { isCompleted });
      if (!res.ok) throw new Error('Failed to update task');
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Task Updated',
        description: 'Task status has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/job', jobId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update task: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Handle task completion toggle
  const handleTaskCompletion = (taskId: number, currentState: boolean) => {
    completeTaskMutation.mutate({ taskId, isCompleted: !currentState });
  };

  // Task form
  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      description: '',
    },
  });

  // Handle task form submission
  const onSubmitTask = (values: TaskFormValues) => {
    createTaskMutation.mutate(values);
  };

  // Calculate task completion stats
  const calculateTaskStats = () => {
    if (!tasks || tasks.length === 0) {
      return { total: 0, completed: 0, percentage: 0 };
    }
    
    const total = tasks.length;
    const completed = tasks.filter((task: any) => task.isCompleted).length;
    const percentage = Math.round((completed / total) * 100);
    
    return { total, completed, percentage };
  };

  const stats = calculateTaskStats();

  // Render compact view
  if (compact) {
    return (
      <div className={className}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-medium text-sm flex items-center">
            <ClipboardList className="h-4 w-4 mr-2" />
            Tasks
          </h3>
          {canEditTasks && (
            <Dialog open={addTaskDialogOpen} onOpenChange={setAddTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2">
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Task</DialogTitle>
                  <DialogDescription>
                    Create a new task for this job
                  </DialogDescription>
                </DialogHeader>
                <Form {...taskForm}>
                  <form onSubmit={taskForm.handleSubmit(onSubmitTask)} className="space-y-4">
                    <FormField
                      control={taskForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Task Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe what needs to be done..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createTaskMutation.isPending}>
                        {createTaskMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          'Add Task'
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoadingTasks ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : !tasks || tasks.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm border rounded-md">
            No tasks have been created for this job yet
          </div>
        ) : (
          <div className="space-y-2">
            <div className="bg-muted h-2 rounded-full overflow-hidden mb-3">
              <div 
                className="bg-primary h-full transition-all duration-500 ease-out" 
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mb-3 flex justify-between">
              <span>{stats.completed} of {stats.total} tasks completed</span>
              <span>{stats.percentage}%</span>
            </div>
            
            {tasks.slice(0, 5).map((task: any) => (
              <div 
                key={task.id} 
                className="p-3 border rounded-md flex items-start gap-3"
              >
                {canCompleteTasks ? (
                  <Checkbox 
                    checked={task.isCompleted}
                    onCheckedChange={() => handleTaskCompletion(task.id, task.isCompleted)}
                    className="mt-0.5"
                  />
                ) : (
                  task.isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  )
                )}
                <div className="flex-1">
                  <p className={`text-sm ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                    {task.description}
                  </p>
                  {task.isCompleted && task.completedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed on {formatDate(task.completedAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {tasks.length > 5 && (
              <Button variant="link" size="sm" className="w-full">
                See all {tasks.length} tasks
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Render full task manager
  return (
    <div className={className}>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Job Tasks</CardTitle>
              <CardDescription>
                {userMode === 'worker' 
                  ? 'Complete tasks to finish the job'
                  : 'Manage tasks for the worker to complete'}
              </CardDescription>
            </div>
            {canEditTasks && (
              <Dialog open={addTaskDialogOpen} onOpenChange={setAddTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Task
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add New Task</DialogTitle>
                    <DialogDescription>
                      Create a new task for this job
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...taskForm}>
                    <form onSubmit={taskForm.handleSubmit(onSubmitTask)} className="space-y-4">
                      <FormField
                        control={taskForm.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Task Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Describe what needs to be done..."
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Clearly describe what the worker needs to accomplish
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="submit" disabled={createTaskMutation.isPending}>
                          {createTaskMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            'Add Task'
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoadingTasks ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : !tasks || tasks.length === 0 ? (
            <div className="text-center py-16 border rounded-md">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <ClipboardList className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No tasks found</h3>
              <p className="text-muted-foreground mt-1">
                {canEditTasks 
                  ? "You haven't added any tasks to this job yet."
                  : "No tasks have been created for this job yet."}
              </p>
              {canEditTasks && (
                <Button 
                  variant="outline" 
                  onClick={() => setAddTaskDialogOpen(true)} 
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Task
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="text-sm font-medium">Task Progress</h3>
                  <span className="text-sm">{stats.percentage}%</span>
                </div>
                <div className="bg-muted h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500 ease-out" 
                    style={{ width: `${stats.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{stats.completed} of {stats.total} tasks completed</span>
                  {stats.completed === stats.total && stats.total > 0 ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> All tasks completed
                    </span>
                  ) : null}
                </div>
              </div>
              
              <Separator />
              
              {/* Tasks list */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium">Tasks</h3>
                
                <div className="space-y-2">
                  {tasks.map((task: any) => (
                    <div 
                      key={task.id} 
                      className={`p-4 border rounded-md flex items-start gap-3 ${
                        task.isCompleted ? 'bg-muted/50' : ''
                      }`}
                    >
                      {canCompleteTasks ? (
                        <Checkbox 
                          checked={task.isCompleted}
                          onCheckedChange={() => handleTaskCompletion(task.id, task.isCompleted)}
                          disabled={completeTaskMutation.isPending}
                          className="mt-0.5"
                        />
                      ) : (
                        task.isCompleted ? (
                          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground mt-0.5" />
                        )
                      )}
                      
                      <div className="flex-1">
                        <p className={`${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                          {task.description}
                        </p>
                        
                        {task.isCompleted && task.completedAt && (
                          <div className="flex mt-2 items-center text-sm text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-green-600" />
                            <span>
                              Completed on {formatDate(task.completedAt)}
                              {task.completedBy && ` by Worker #${task.completedBy}`}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {canEditTasks && !task.isCompleted && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {canEditTasks && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="h-8 w-8 cursor-move text-muted-foreground"
                        >
                          <Grip className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
        
        {tasks && tasks.length > 0 && stats.completed === stats.total && (
          <CardFooter className="flex justify-between pt-2">
            <div className="text-sm">
              All tasks completed
            </div>
            {/* Only job workers can mark a job as complete */}
            {isWorker && (
              <Button variant="default" className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark Job Complete
              </Button>
            )}
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default TaskManager;