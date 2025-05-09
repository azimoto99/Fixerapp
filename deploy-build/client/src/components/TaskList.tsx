import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Task, InsertTask } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Plus, Check, Move, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';

interface TaskListProps {
  jobId: number;
  isJobPoster: boolean;
  isWorker: boolean;
}

const taskSchema = z.object({
  description: z.string().min(1, 'Task description is required'),
  jobId: z.number(),
  position: z.number().optional()
});

type TaskFormValues = z.infer<typeof taskSchema>;

export default function TaskList({ jobId, isJobPoster, isWorker }: TaskListProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isReordering, setIsReordering] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);

  // Fetch tasks for the job
  const { 
    data: tasks, 
    isLoading,
    error
  } = useQuery<Task[]>({
    queryKey: ['/api/tasks/job', jobId],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/tasks/job/${jobId}`);
      return res.json();
    },
    enabled: !!jobId
  });

  // Add new task mutation
  const addTaskMutation = useMutation({
    mutationFn: async (task: InsertTask) => {
      const res = await apiRequest('POST', '/api/tasks', task);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/job', jobId] });
      setNewTaskOpen(false);
      toast({
        title: 'Task added',
        description: 'The task has been added to the job',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding task',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Task> }) => {
      const res = await apiRequest('PATCH', `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/job', jobId] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating task',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Reorder tasks mutation
  const reorderTasksMutation = useMutation({
    mutationFn: async (taskIds: number[]) => {
      const res = await apiRequest('POST', '/api/tasks/reorder', {
        jobId,
        taskIds
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tasks/job', jobId] });
      setIsReordering(false);
      toast({
        title: 'Tasks reordered',
        description: 'The task order has been updated',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error reordering tasks',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  // Form for adding new tasks
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      description: '',
      jobId
    }
  });

  // Handle task completion
  const toggleTaskCompletion = (task: Task) => {
    updateTaskMutation.mutate({ 
      id: task.id, 
      data: { isCompleted: !task.isCompleted } 
    });
  };

  // Handle task reordering
  const handleReorder = (taskIds: number[]) => {
    reorderTasksMutation.mutate(taskIds);
  };

  // Move task up in order
  const moveTaskUp = (index: number) => {
    if (!tasks || index <= 0) return;
    
    const newTaskIds = [...tasks.map(t => t.id)];
    [newTaskIds[index], newTaskIds[index - 1]] = [newTaskIds[index - 1], newTaskIds[index]];
    handleReorder(newTaskIds);
  };

  // Move task down in order
  const moveTaskDown = (index: number) => {
    if (!tasks || index >= tasks.length - 1) return;
    
    const newTaskIds = [...tasks.map(t => t.id)];
    [newTaskIds[index], newTaskIds[index + 1]] = [newTaskIds[index + 1], newTaskIds[index]];
    handleReorder(newTaskIds);
  };

  // Handle form submission for new task
  const onSubmit = (values: TaskFormValues) => {
    // Calculate the new task position (at the end of the list)
    const newPosition = tasks && tasks.length > 0 ? tasks.length : 0;
    
    // Add position to the task data (ensure it's provided and not optional)
    addTaskMutation.mutate({
      ...values,
      position: newPosition as number
    });
    
    form.reset();
  };
  
  // Calculate completion percentage
  const getCompletionPercentage = () => {
    if (!tasks || tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.isCompleted).length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-500">
        Error loading tasks: {(error as Error).message}
      </div>
    );
  }

  const completionPercentage = getCompletionPercentage();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          Tasks
          <div className="text-sm font-normal">
            {completionPercentage}% Complete
          </div>
        </CardTitle>
        <CardDescription>
          {tasks && tasks.length > 0 
            ? `${tasks.filter(t => t.isCompleted).length} of ${tasks.length} tasks completed`
            : 'No tasks defined for this job'}
        </CardDescription>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
          <div 
            className="bg-primary h-2.5 rounded-full" 
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ul className="space-y-3">
          {tasks && tasks.map((task, index) => (
            <li 
              key={task.id} 
              className={`flex items-center justify-between p-3 rounded-md border ${
                task.isCompleted ? 'bg-gray-50' : 'bg-white'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                {(isJobPoster || isWorker) && (
                  <Checkbox 
                    checked={task.isCompleted}
                    onCheckedChange={() => toggleTaskCompletion(task)}
                    disabled={!isWorker && !isJobPoster}
                  />
                )}
                <span className={task.isCompleted ? 'line-through text-gray-500' : ''}>
                  {task.description}
                </span>
                
                {task.completedBy && task.isCompleted && (
                  <span className="text-xs text-gray-500 ml-2">
                    Completed {new Date(task.completedAt!).toLocaleString()}
                  </span>
                )}
              </div>
              
              {isReordering && isJobPoster && (
                <div className="flex gap-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => moveTaskUp(index)}
                    disabled={index === 0}
                  >
                    <Move className="h-4 w-4 rotate-90" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => moveTaskDown(index)}
                    disabled={index === (tasks?.length || 0) - 1}
                  >
                    <Move className="h-4 w-4 -rotate-90" />
                  </Button>
                </div>
              )}
            </li>
          ))}
          
          {newTaskOpen && isJobPoster && (
            <li className="p-3 rounded-md border bg-white">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input 
                            placeholder="Enter task description" 
                            {...field} 
                            autoFocus
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    size="sm"
                    disabled={addTaskMutation.isPending}
                  >
                    {addTaskMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={() => setNewTaskOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </form>
              </Form>
            </li>
          )}
        </ul>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {isJobPoster && (
          <>
            {!newTaskOpen && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setNewTaskOpen(true)}
                disabled={isReordering}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            )}
            
            {tasks && tasks.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReordering(!isReordering)}
                disabled={newTaskOpen}
              >
                {isReordering ? 'Done Reordering' : 'Reorder Tasks'}
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}