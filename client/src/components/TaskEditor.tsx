import { useState } from 'react';
import { PlusCircle, Trash2, Clock, MapPin, CreditCard, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { cn } from '@/lib/utils';
import { InsertTask } from '@shared/schema';

// Format time for display
function formatTime(date: Date | null, forInput: boolean = false): string {
  if (!date) return '';
  
  try {
    if (forInput) {
      return date.toTimeString().slice(0, 5); // HH:MM format for inputs
    }
    
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }).format(date);
  } catch (error) {
    console.error("Error formatting time:", error);
    return '';
  }
}

export type TaskItemProps = {
  description: string;
  position: number;
  isOptional: boolean;
  dueTime?: Date | null;
  location?: string;
  latitude?: number;
  longitude?: number;
  bonusAmount?: number;
};

type TaskEditorProps = {
  tasks: TaskItemProps[];
  setTasks: React.Dispatch<React.SetStateAction<TaskItemProps[]>>;
};

export default function TaskEditor({ tasks, setTasks }: TaskEditorProps) {
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [showTimeSelector, setShowTimeSelector] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [showBonusSelector, setShowBonusSelector] = useState(false);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [bonusAmount, setBonusAmount] = useState<number>(0);

  const addTask = () => {
    if (!newTaskDescription.trim()) return;
    
    const newTask: TaskItemProps = {
      description: newTaskDescription,
      position: tasks.length,
      isOptional: false,
      dueTime: selectedTime ? new Date(`2000-01-01T${selectedTime}`) : null,
      location: '',
      bonusAmount: 0
    };
    
    setTasks([...tasks, newTask]);
    setNewTaskDescription('');
    setSelectedTime('');
    setShowTimeSelector(false);
    setShowLocationSelector(false);
    setShowBonusSelector(false);
  };

  const removeTask = (index: number) => {
    const updatedTasks = tasks.filter((_, i) => i !== index);
    // Update positions after removal
    const reorderedTasks = updatedTasks.map((task, i) => ({
      ...task,
      position: i
    }));
    setTasks(reorderedTasks);
  };

  const toggleOptional = (index: number) => {
    const updatedTasks = tasks.map((task, i) => 
      i === index ? { ...task, isOptional: !task.isOptional } : task
    );
    setTasks(updatedTasks);
  };

  const updateTaskLocation = (index: number, location: string, lat?: number, lng?: number) => {
    const updatedTasks = tasks.map((task, i) => 
      i === index ? { 
        ...task, 
        location, 
        latitude: lat || task.latitude, 
        longitude: lng || task.longitude 
      } : task
    );
    setTasks(updatedTasks);
  };

  const updateTaskTime = (index: number, time: string) => {
    const updatedTasks = tasks.map((task, i) => 
      i === index ? { 
        ...task, 
        dueTime: time ? new Date(`2000-01-01T${time}`) : null
      } : task
    );
    setTasks(updatedTasks);
  };

  const updateTaskBonus = (index: number, amount: number) => {
    const updatedTasks = tasks.map((task, i) => 
      i === index ? { ...task, bonusAmount: amount } : task
    );
    setTasks(updatedTasks);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      addTask();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Tasks</h3>
        {tasks.length > 0 && (
          <div className="text-sm text-muted-foreground">
            {tasks.length} task{tasks.length !== 1 && 's'}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <Card key={index} className={`${task.isOptional ? 'border-dashed border-yellow-500/30' : ''}`}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="h-5 w-5 flex-shrink-0 mt-1">
                  {task.isOptional ? (
                    <div className="h-5 w-5 rounded-full border-2 border-yellow-500/60 flex items-center justify-center">
                      <span className="text-yellow-500 text-xs">+</span>
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary text-xs">{index+1}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="text-sm font-medium mb-1">{task.description}</div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {task.dueTime && (
                      <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                        <Clock className="h-3 w-3" />
                        <span>{formatTime(task.dueTime)}</span>
                      </div>
                    )}
                    
                    {task.location && (
                      <div className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[150px]">{task.location}</span>
                      </div>
                    )}
                    
                    {task.isOptional && task.bonusAmount && task.bonusAmount > 0 && (
                      <div className="flex items-center gap-1 text-xs bg-yellow-500/10 text-yellow-700 px-2 py-1 rounded-full">
                        <CreditCard className="h-3 w-3" />
                        <span>${task.bonusAmount.toFixed(2)} bonus</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {/* Toggle optional */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0" 
                    onClick={() => toggleOptional(index)}
                    title={task.isOptional ? "Make required" : "Make optional (bonus)"}
                  >
                    {task.isOptional ? (
                      <Check className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <PlusCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  
                  {/* Delete button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeTask(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Task details editor */}
              {editingTaskIndex === index && (
                <div className="mt-3 pt-3 border-t space-y-3">
                  {/* Time selector */}
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={`h-8 text-xs ${showTimeSelector ? 'bg-primary/10' : ''}`}
                      onClick={() => setShowTimeSelector(!showTimeSelector)}
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {task.dueTime ? 'Edit Time' : 'Add Time'}
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      className={`h-8 text-xs ${showLocationSelector ? 'bg-primary/10' : ''}`}
                      onClick={() => setShowLocationSelector(!showLocationSelector)}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      {task.location ? 'Edit Location' : 'Add Location'}
                    </Button>
                    
                    {task.isOptional && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        className={`h-8 text-xs text-yellow-600 border-yellow-300 ${showBonusSelector ? 'bg-yellow-50' : ''}`}
                        onClick={() => setShowBonusSelector(!showBonusSelector)}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        {task.bonusAmount && task.bonusAmount > 0 ? 'Edit Bonus' : 'Add Bonus'}
                      </Button>
                    )}
                  </div>
                  
                  {showTimeSelector && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={task.dueTime ? formatTime(task.dueTime, true) : ''}
                        onChange={(e) => updateTaskTime(index, e.target.value)}
                        className="w-40"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          updateTaskTime(index, '');
                          setShowTimeSelector(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {showLocationSelector && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <AddressAutocomplete
                          placeholder="Enter task location"
                          value={task.location || ''}
                          onChange={(value) => updateTaskLocation(index, value)}
                          onLocationSelect={(result) => {
                            if (result.success) {
                              updateTaskLocation(
                                index, 
                                result.displayName || task.location || '', 
                                result.latitude, 
                                result.longitude
                              );
                            }
                          }}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          updateTaskLocation(index, '');
                          setShowLocationSelector(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  {showBonusSelector && task.isOptional && (
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        <span className="text-sm mr-2">Bonus Amount: $</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.50"
                          value={task.bonusAmount || 0}
                          onChange={(e) => updateTaskBonus(index, parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setShowBonusSelector(false);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setEditingTaskIndex(null)}
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
              
              {editingTaskIndex !== index && (
                <div className="mt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2 py-1 h-7"
                    onClick={() => setEditingTaskIndex(index)}
                  >
                    Edit Details
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add new task */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Textarea
            placeholder="Add a task e.g., 'Clean the kitchen thoroughly' or 'Assemble IKEA bookshelf'"
            value={newTaskDescription}
            onChange={(e) => setNewTaskDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            className="pr-10 min-h-[60px]"
          />
          {showTimeSelector && (
            <div className="mt-2">
              <Input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-40"
                placeholder="Select time"
              />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={addTask}
            className="h-10 p-0 w-10"
            disabled={!newTaskDescription.trim()}
          >
            <PlusCircle className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowTimeSelector(!showTimeSelector)}
            className="h-10 p-0 w-10"
          >
            <Clock className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground">
        <p>Press Enter to add a task. Optional tasks can be completed for bonus payment.</p>
      </div>
    </div>
  );
}