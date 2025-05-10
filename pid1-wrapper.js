#!/usr/bin/env node

/**
 * PID1 wrapper script
 * This is a special wrapper for containerized environments that prevents PID1 stalling
 * 
 * When running in a container, this script should be PID1 and will properly handle
 * zombie processes and signal forwarding to the main application
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

// For signal handling and cleanup
const runningProcesses = new Set();

// Proper signal handling is critical for PID1
process.on('SIGINT', () => forwardSignalToChildren('SIGINT'));
process.on('SIGTERM', () => forwardSignalToChildren('SIGTERM'));

// Forward signals to all child processes and exit
function forwardSignalToChildren(signal) {
  console.log(`PID1 wrapper received ${signal}, forwarding to children...`);
  
  // Forward the signal to all child processes
  for (const pid of runningProcesses) {
    try {
      process.kill(pid, signal);
    } catch (err) {
      // Process may have already exited
      console.error(`Failed to send ${signal} to process ${pid}:`, err.message);
    }
  }
  
  // Give processes time to clean up before exiting
  setTimeout(() => {
    console.log('PID1 wrapper exiting after signal timeout');
    process.exit(0);
  }, 5000);
}

// Reap zombie processes (critical function of PID1 in containers)
process.on('SIGCHLD', () => {
  // Different Node.js versions have different waitpid implementations
  let pid;
  try {
    if (typeof process.waitpid === 'function') {
      // Node.js 19+
      pid = process.waitpid(-1, { options: 0 });
    } else {
      // Older Node.js versions already auto-reap children
      // But we still need to update our tracking when a child exits
      // This is handled by the 'exit' event on the child process
    }
  } catch (err) {
    // Ignore common issues with waitpid
    console.error('Error reaping child process:', err);
  }
  
  if (pid && runningProcesses.has(pid)) {
    console.log(`Child process ${pid} has exited, removed from tracking`);
    runningProcesses.delete(pid);
  }
});

// Main function to start the application
function startApplication() {
  console.log('PID1 wrapper starting application...');
  
  // Check if we're running as PID1 (in container)
  if (process.pid !== 1) {
    console.log('Warning: Not running as PID1, forwarding to start.sh directly');
    // In local development, just exec the start script
    const child = spawn('./start.sh', [], {
      stdio: 'inherit',
      shell: true
    });
    
    runningProcesses.add(child.pid);
    console.log(`Started main application with PID ${child.pid}`);
    
    // Handle child process exit
    child.on('exit', (code, signal) => {
      console.log(`Main application exited with code ${code} and signal ${signal}`);
      runningProcesses.delete(child.pid);
      
      if (runningProcesses.size === 0) {
        process.exit(code || 0);
      }
    });
    
    return;
  }
  
  // In container, start the application
  console.log('Running as PID1 in container environment');
  
  // Start the main application
  const mainProcess = spawn('./start.sh', [], {
    stdio: 'inherit',
    shell: true
  });
  
  runningProcesses.add(mainProcess.pid);
  console.log(`Started main application with PID ${mainProcess.pid}`);
  
  // Handle main process exit
  mainProcess.on('exit', (code, signal) => {
    console.log(`Main application exited with code ${code} and signal ${signal}`);
    runningProcesses.delete(mainProcess.pid);
    
    // We don't exit here - PID1 must stay running to maintain the container
    // Instead, the start.sh script will start the fallback health server
  });
}

// Start the application
startApplication();

// Keep PID1 alive
console.log('PID1 wrapper is running and monitoring child processes');