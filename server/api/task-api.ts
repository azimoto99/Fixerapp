import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { insertTaskSchema } from "@shared/schema";
import { isAuthenticated } from "../routes";

// Initialize task API router
export const taskRouter = Router();

// Get task by ID
taskRouter.get("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    res.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ message: "Failed to fetch task" });
  }
});

// Get tasks for a job
taskRouter.get("/job/:jobId", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Verify the user has access to this job
    if (job.posterId !== req.user?.id && job.workerId !== req.user?.id) {
      return res.status(403).json({ message: "You do not have access to this job's tasks" });
    }

    const tasks = await storage.getTasksForJob(jobId);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks for job:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
});

// Create a new task
taskRouter.post("/", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const validationResult = insertTaskSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: "Invalid task data", 
        errors: validationResult.error.format() 
      });
    }

    const taskData = validationResult.data;
    
    // Verify the job exists and user is the poster
    const job = await storage.getJob(taskData.jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.posterId !== req.user?.id) {
      return res.status(403).json({ message: "Only the job poster can add tasks" });
    }

    // If position isn't provided, get the max position and increment
    if (!taskData.position) {
      const tasks = await storage.getTasksForJob(taskData.jobId);
      let maxPosition = 0;
      if (tasks && tasks.length > 0) {
        maxPosition = Math.max(...tasks.map(t => t.position || 0));
      }
      taskData.position = maxPosition + 1;
    }

    const newTask = await storage.createTask(taskData);
    res.status(201).json(newTask);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
});

// Update a task
taskRouter.patch("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Get the job to verify permissions
    const job = await storage.getJob(task.jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Only the job poster can update tasks
    if (job.posterId !== req.user?.id) {
      return res.status(403).json({ message: "Only the job poster can update tasks" });
    }

    // Update the task
    const updatedTask = await storage.updateTask(taskId, req.body);
    if (!updatedTask) {
      return res.status(404).json({ message: "Failed to update task" });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
});

// Delete a task
taskRouter.delete("/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Get the job to verify permissions
    const job = await storage.getJob(task.jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Only the job poster can delete tasks
    if (job.posterId !== req.user?.id) {
      return res.status(403).json({ message: "Only the job poster can delete tasks" });
    }

    // Delete the task
    const result = await storage.deleteTask(taskId);
    if (!result) {
      return res.status(404).json({ message: "Failed to delete task" });
    }

    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ message: "Failed to delete task" });
  }
});

// Mark a task as complete
taskRouter.post("/:id/complete", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    if (isNaN(taskId)) {
      return res.status(400).json({ message: "Invalid task ID" });
    }

    const task = await storage.getTask(taskId);
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Get the job to verify permissions
    const job = await storage.getJob(task.jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Only the assigned worker can complete tasks
    if (job.workerId !== req.user?.id) {
      return res.status(403).json({ message: "Only the assigned worker can complete tasks" });
    }

    // Complete the task
    const updatedTask = await storage.completeTask(taskId, req.user.id);
    if (!updatedTask) {
      return res.status(404).json({ message: "Failed to complete task" });
    }

    // Check if all tasks are complete and update job if necessary
    const tasks = await storage.getTasksForJob(job.id);
    const allTasksCompleted = tasks.every(t => t.isCompleted);
    
    if (allTasksCompleted) {
      // All tasks are completed, update job status
      const completedJob = await storage.updateJob(job.id, {
        tasksCompleted: tasks.length,
        tasksTotal: tasks.length
      });
      
      // Create a notification for the job poster
      await storage.createNotification({
        userId: job.posterId,
        title: "All Tasks Completed",
        message: `All tasks for job "${job.title}" have been completed.`,
        type: "tasks_completed",
        sourceId: job.id,
        sourceType: "job",
        metadata: {
          jobId: job.id,
          completedBy: req.user.id
        }
      });
    } else {
      // Update completed task count
      const completedTasks = tasks.filter(t => t.isCompleted);
      await storage.updateJob(job.id, {
        tasksCompleted: completedTasks.length,
        tasksTotal: tasks.length
      });
    }

    res.json(updatedTask);
  } catch (error) {
    console.error("Error completing task:", error);
    res.status(500).json({ message: "Failed to complete task" });
  }
});

// Reorder tasks
taskRouter.post("/job/:jobId/reorder", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId);
    if (isNaN(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const { taskIds } = req.body;
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: "Task IDs must be provided as an array" });
    }

    // Get the job to verify permissions
    const job = await storage.getJob(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // Only the job poster can reorder tasks
    if (job.posterId !== req.user?.id) {
      return res.status(403).json({ message: "Only the job poster can reorder tasks" });
    }

    // Get all tasks for this job to verify all taskIds belong to the job
    const tasks = await storage.getTasksForJob(jobId);
    const taskIdSet = new Set(tasks.map(t => t.id));
    
    // Verify all provided taskIds belong to this job
    for (const id of taskIds) {
      if (!taskIdSet.has(id)) {
        return res.status(400).json({ message: `Task ID ${id} does not belong to this job` });
      }
    }

    // Reorder tasks
    const reorderedTasks = await storage.reorderTasks(jobId, taskIds);
    res.json(reorderedTasks);
  } catch (error) {
    console.error("Error reordering tasks:", error);
    res.status(500).json({ message: "Failed to reorder tasks" });
  }
});

// Helper function to delete a task - private use
async function deleteTask(req: Request, res: Response) {
  const taskId = parseInt(req.params.id);
  if (isNaN(taskId)) {
    return res.status(400).json({ message: "Invalid task ID" });
  }

  const task = await storage.getTask(taskId);
  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  // Get the job to verify permissions
  const job = await storage.getJob(task.jobId);
  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  // Only the job poster can delete tasks
  if (job.posterId !== req.user?.id) {
    return res.status(403).json({ message: "Only the job poster can delete tasks" });
  }

  // Delete the task
  const result = await storage.deleteTask(taskId);
  if (!result) {
    return res.status(404).json({ message: "Failed to delete task" });
  }

  return true;
}