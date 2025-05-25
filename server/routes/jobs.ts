import express, { Request, Response } from "express";
import { storage } from "../storage";
import { createJobWithPaymentFirst, updateJobWithPaymentCheck } from '../payment-first-job-posting';
import { applySecurity, sanitizeInput } from '../security-config';
import { body, param, validationResult } from 'express-validator';
import { isAuthenticated } from './auth';

const router = express.Router();

// Job-related routes will be moved here from main routes.ts
// This includes job posting, searching, applications, and management

// Helper function for distance calculation
function calculateDistanceInFeet(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const earthRadiusInFeet = 20902231;
  const latRad1 = (lat1 * Math.PI) / 180;
  const lonRad1 = (lon1 * Math.PI) / 180;
  const latRad2 = (lat2 * Math.PI) / 180;
  const lonRad2 = (lon2 * Math.PI) / 180;
  
  const deltaLat = latRad2 - latRad1;
  const deltaLon = lonRad2 - lonRad1;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(latRad1) * Math.cos(latRad2) *
    Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return earthRadiusInFeet * c;
}

// Jobs routes will be extracted and organized here
// Placeholder structure - actual routes will be moved from routes.ts

export { router as jobsRouter };