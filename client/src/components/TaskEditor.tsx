import React, { useState, useEffect } from 'react';
import { Trash2, GripVertical, Plus, Clock, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export interface Task {
  id?: number;
  description: string;
  isCompleted?: boolean;
  completedAt?: string | null;
  completedBy?: number | null;
  position: number;
  isOptional: boolean;
  dueTime?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  bonusAmount?: number | null;
}

interface TaskEditorProps {
  tasks: Task[];
  onChange: (tasks: Task[]) => void;
  disabled?: boolean;
}

const TaskEditor: React.FC<TaskEditorProps> = ({ tasks, onChange, disabled = false }) => {
  const [taskList, setTaskList] = useState<Task[]>(tasks || []);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setTaskList(tasks);
  }, [tasks]);

  const handleAddTask = () => {
    const newTask: Task = {
      description: '',
      position: taskList.length,
      isOptional: false,
    };
    
    const updatedTasks = [...taskList, newTask];
    setTaskList(updatedTasks);
    onChange(updatedTasks);
  };

  const handleRemoveTask = (index: number) => {
    const updatedTasks = taskList.filter((_, i) => i !== index);
    
    // Update positions after removal
    const reindexedTasks = updatedTasks.map((task, i) => ({
      ...task,
      position: i
    }));
    
    setTaskList(reindexedTasks);
    onChange(reindexedTasks);
  };

  const handleTaskChange = (index: number, field: keyof Task, value: any) => {
    const updatedTasks = [...taskList];
    updatedTasks[index] = {
      ...updatedTasks[index],
      [field]: value
    };
    
    setTaskList(updatedTasks);
    onChange(updatedTasks);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    // Reorder the tasks
    const newTasks = [...taskList];
    const draggedTask = newTasks[draggedIndex];
    
    // Remove the task from its current position
    newTasks.splice(draggedIndex, 1);
    // Insert it at the new position
    newTasks.splice(index, 0, draggedTask);
    
    // Update positions
    const reindexedTasks = newTasks.map((task, i) => ({
      ...task,
      position: i
    }));
    
    setTaskList(reindexedTasks);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    onChange(taskList);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Tasks</h3>
        <Button 
          onClick={handleAddTask} 
          size="sm" 
          disabled={disabled}
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>
      
      {taskList.length === 0 ? (
        <div className="border border-dashed border-border rounded-md p-4 text-center text-muted-foreground">
          No tasks yet. Add tasks to break down the job into steps.
        </div>
      ) : (
        <div className="space-y-3">
          {taskList.map((task, index) => (
            <Card 
              key={index}
              className={`relative ${draggedIndex === index ? 'opacity-70 border-primary' : ''}`}
              draggable={!disabled}
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div className="absolute left-2 top-1/2 transform -translate-y-1/2 cursor-move opacity-50 hover:opacity-100">
                <GripVertical className="h-5 w-5 text-muted-foreground" />
              </div>
              
              <CardContent className="p-3 pl-9">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor={`task-${index}-description`} className="text-sm font-medium">
                      Description
                    </Label>
                    <Textarea
                      id={`task-${index}-description`}
                      placeholder="Describe what needs to be done"
                      value={task.description}
                      onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                      className="mt-1 min-h-[60px]"
                      disabled={disabled}
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <Label htmlFor={`task-${index}-location`} className="text-sm font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> Location (optional)
                      </Label>
                      <Input
                        id={`task-${index}-location`}
                        placeholder="Specific location for this task"
                        value={task.location || ''}
                        onChange={(e) => handleTaskChange(index, 'location', e.target.value)}
                        className="mt-1"
                        disabled={disabled}
                      />
                    </div>
                    
                    {task.isOptional && (
                      <div className="w-[120px]">
                        <Label htmlFor={`task-${index}-bonus`} className="text-sm font-medium flex items-center gap-1">
                          Bonus ($)
                        </Label>
                        <Input
                          id={`task-${index}-bonus`}
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={task.bonusAmount || ''}
                          onChange={(e) => handleTaskChange(index, 'bonusAmount', parseFloat(e.target.value) || null)}
                          className="mt-1"
                          disabled={disabled}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`task-${index}-optional`}
                          checked={task.isOptional}
                          onCheckedChange={(checked) => handleTaskChange(index, 'isOptional', !!checked)}
                          disabled={disabled}
                        />
                        <Label htmlFor={`task-${index}-optional`} className="text-sm font-medium">
                          Optional task
                        </Label>
                      </div>
                      
                      {task.isOptional && (
                        <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-800">
                          Bonus
                        </Badge>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTask(index)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      disabled={disabled}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskEditor;