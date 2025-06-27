# Fixer - API Documentation

## API Overview

The Fixer platform provides a comprehensive REST API for interacting with jobs, users, applications, payments, location verification, and enterprise features. This documentation outlines the available endpoints, request/response formats, and authentication requirements.

## Authentication

All API requests (except public endpoints) require authentication. The platform uses session-based authentication.

- **Login**: `POST /api/login` with username and password credentials
- **Logout**: `POST /api/logout` to end the session
- **Current User**: `GET /api/user` to retrieve authenticated user information

### Google Authentication

OAuth 2.0 support is available for Google authentication. After successful authentication, a session is created and maintained.

## Base URL

The base URL for all API endpoints is: `https://{your-domain}/api`

## Response Format

All responses are returned in JSON format with the following structure:

```json
{
  "data": { ... },  // Response data (may be an object or array)
  "error": { ... }  // Error details (only present when there's an error)
}
```

## User Endpoints

### Get Current User
- **URL**: `/api/user`
- **Method**: `GET`
- **Description**: Returns the currently authenticated user's information
- **Response Example**:
  ```json
  {
    "id": 123,
    "username": "johndoe",
    "fullName": "John Doe",
    "email": "john@example.com",
    "accountType": "worker",
    "profileComplete": true
  }
  ```

### Get User by ID
- **URL**: `/api/users/:id`
- **Method**: `GET`
- **Description**: Returns information about a specific user
- **Parameters**:
  - `id` (path): User ID
- **Response Example**:
  ```json
  {
    "id": 123,
    "username": "johndoe",
    "fullName": "John Doe",
    "email": "john@example.com",
    "accountType": "worker",
    "profileComplete": true
  }
  ```

### Update User
- **URL**: `/api/users/:id`
- **Method**: `PATCH`
- **Description**: Updates user information
- **Parameters**:
  - `id` (path): User ID
- **Request Body Example**:
  ```json
  {
    "fullName": "John Smith",
    "skills": ["carpentry", "plumbing"]
  }
  ```
- **Response**: Updated user object

## Account Type Management

### Switch Account Type
- **URL**: `/api/account-type/switch`
- **Method**: `POST`
- **Description**: Switches between account types (worker, poster, enterprise)
- **Request Body Example**:
  ```json
  {
    "accountType": "poster"
  }
  ```
- **Response**: Updated user session with new account type

### Get Available Account Types
- **URL**: `/api/account-type/available`
- **Method**: `GET`
- **Description**: Returns available account types for the current user
- **Response Example**:
  ```json
  {
    "availableTypes": ["worker", "poster", "enterprise"],
    "currentType": "worker"
  }
  ```

## Job Endpoints

### Get All Jobs
- **URL**: `/api/jobs`
- **Method**: `GET`
- **Description**: Returns a list of jobs, filterable by various parameters
- **Query Parameters**:
  - `posterId` (optional): Filter by job poster ID
  - `status` (optional): Filter by job status ("open", "assigned", "completed")
  - `category` (optional): Filter by job category
  - `latitude` (optional): Latitude for location-based search
  - `longitude` (optional): Longitude for location-based search
  - `radius` (optional): Search radius in miles
- **Response**: Array of job objects

### Get Job by ID
- **URL**: `/api/jobs/:id`
- **Method**: `GET`
- **Description**: Returns details about a specific job
- **Parameters**:
  - `id` (path): Job ID
- **Response**: Job object with details

### Create Job
- **URL**: `/api/jobs`
- **Method**: `POST`
- **Description**: Creates a new job
- **Authentication**: Required, user must have "poster" or "enterprise" account type
- **Request Body Example**:
  ```json
  {
    "title": "Fix Kitchen Sink",
    "description": "The kitchen sink is leaking and needs repair",
    "category": "plumbing",
    "paymentAmount": 75.00,
    "location": "123 Main St, City, State",
    "latitude": 37.7749,
    "longitude": -122.4194,
    "requiredSkills": ["plumbing"],
    "urgency": "normal"
  }
  ```
- **Response**: Created job object

### Update Job
- **URL**: `/api/jobs/:id`
- **Method**: `PATCH`
- **Description**: Updates a job's information
- **Authentication**: Required, user must be the job poster
- **Parameters**:
  - `id` (path): Job ID
- **Request Body Example**:
  ```json
  {
    "status": "assigned",
    "assignedWorkerId": 456
  }
  ```
- **Response**: Updated job object

### Delete Job
- **URL**: `/api/jobs/:id`
- **Method**: `DELETE`
- **Description**: Deletes a job
- **Authentication**: Required, user must be the job poster
- **Parameters**:
  - `id` (path): Job ID
- **Response**: Success message

## Location Verification Endpoints

### Start Job with Location Verification
- **URL**: `/api/jobs/:jobId/start-with-location`
- **Method**: `POST`
- **Description**: Starts a job with location verification to prevent fraud
- **Authentication**: Required, user must be assigned worker
- **Request Body Example**:
  ```json
  {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 5.0,
    "timestamp": "2024-01-15T10:30:00Z",
    "deviceInfo": {
      "userAgent": "Mozilla/5.0...",
      "platform": "web"
    }
  }
  ```
- **Response**: Verification result with confidence level

### Verify Location During Job
- **URL**: `/api/jobs/:jobId/verify-location`
- **Method**: `POST`
- **Description**: Ongoing location verification during job execution
- **Authentication**: Required, user must be assigned worker
- **Request Body**: Same as start verification
- **Response**: Verification status and any warnings

### Get Location History
- **URL**: `/api/jobs/:jobId/location-history`
- **Method**: `GET`
- **Description**: Returns location verification history for a job
- **Authentication**: Required, user must be job poster or assigned worker
- **Response**: Array of location verification records

## Application Endpoints

### Create Application
- **URL**: `/api/applications`
- **Method**: `POST`
- **Description**: Submits a job application
- **Authentication**: Required, user must have "worker" account type
- **Request Body Example**:
  ```json
  {
    "jobId": 789,
    "message": "I am experienced in plumbing and available to start immediately."
  }
  ```
- **Response**: Created application object

### Get Applications for Job
- **URL**: `/api/applications/job/:jobId`
- **Method**: `GET`
- **Description**: Returns all applications for a specific job
- **Authentication**: Required, user must be the job poster
- **Parameters**:
  - `jobId` (path): Job ID
- **Response**: Array of application objects

### Get Applications for Worker
- **URL**: `/api/applications/worker/:workerId`
- **Method**: `GET`
- **Description**: Returns all applications submitted by a worker
- **Authentication**: Required, user must be the worker
- **Parameters**:
  - `workerId` (path): Worker ID
- **Response**: Array of application objects

### Update Application Status
- **URL**: `/api/applications/:id`
- **Method**: `PATCH`
- **Description**: Updates an application's status
- **Authentication**: Required, user must be the job poster
- **Parameters**:
  - `id` (path): Application ID
- **Request Body Example**:
  ```json
  {
    "status": "accepted"  // or "rejected"
  }
  ```
- **Response**: Updated application object

## Payment Endpoints

### Create Payment Intent
- **URL**: `/api/stripe/create-payment-intent`
- **Method**: `POST`
- **Description**: Creates a Stripe payment intent for processing payment
- **Authentication**: Required
- **Request Body Example**:
  ```json
  {
    "amount": 75.00,
    "jobId": 789,
    "workerId": 456
  }
  ```
- **Response**:
  ```json
  {
    "clientSecret": "pi_abc123_secret_xyz456",
    "paymentId": 101
  }
  ```

### Confirm Payment
- **URL**: `/api/stripe/confirm-payment`
- **Method**: `POST`
- **Description**: Confirms a payment after Stripe processing
- **Authentication**: Required
- **Request Body Example**:
  ```json
  {
    "paymentIntentId": "pi_abc123",
    "paymentId": 101
  }
  ```
- **Response**: Updated payment object

### Get User Payments
- **URL**: `/api/payments/user/:userId`
- **Method**: `GET`
- **Description**: Returns all payments associated with a user
- **Authentication**: Required, must be the user or admin
- **Parameters**:
  - `userId` (path): User ID
- **Response**: Array of payment objects

## Poster Dashboard Endpoints

### Get Dashboard Overview
- **URL**: `/api/poster/dashboard/overview`
- **Method**: `GET`
- **Description**: Returns overview statistics for poster dashboard
- **Authentication**: Required, user must have "poster" or "enterprise" account type
- **Response Example**:
  ```json
  {
    "totalJobs": 25,
    "activeJobs": 8,
    "completedJobs": 17,
    "totalApplications": 156,
    "pendingApplications": 12,
    "totalSpent": 2450.00
  }
  ```

### Get Job Analytics
- **URL**: `/api/poster/jobs/:jobId/analytics`
- **Method**: `GET`
- **Description**: Returns detailed analytics for a specific job
- **Authentication**: Required, user must be job poster
- **Response**: Job performance metrics and application data

## Enterprise Endpoints

### Get Team Members
- **URL**: `/api/enterprise/team`
- **Method**: `GET`
- **Description**: Returns team members for enterprise account
- **Authentication**: Required, user must have "enterprise" account type
- **Response**: Array of team member objects

### Bulk Job Creation
- **URL**: `/api/enterprise/jobs/bulk`
- **Method**: `POST`
- **Description**: Creates multiple jobs at once
- **Authentication**: Required, user must have "enterprise" account type
- **Request Body**: Array of job objects
- **Response**: Array of created job objects

### Enterprise Analytics
- **URL**: `/api/enterprise/analytics`
- **Method**: `GET`
- **Description**: Returns comprehensive analytics for enterprise account
- **Authentication**: Required, user must have "enterprise" account type
- **Response**: Detailed analytics and reporting data

## Admin Endpoints

### Get All Users
- **URL**: `/api/admin/users`
- **Method**: `GET`
- **Description**: Returns all users with pagination
- **Authentication**: Required, admin role
- **Query Parameters**:
  - `page` (optional): Page number
  - `limit` (optional): Items per page
- **Response**: Paginated user list

### Moderate Content
- **URL**: `/api/admin/moderate/:contentType/:id`
- **Method**: `PATCH`
- **Description**: Moderate user-generated content
- **Authentication**: Required, admin role
- **Parameters**:
  - `contentType` (path): Type of content (job, user, review)
  - `id` (path): Content ID
- **Request Body Example**:
  ```json
  {
    "action": "approve",  // or "reject", "flag"
    "reason": "Content violates community guidelines"
  }
  ```

## Privacy Endpoints

### Get Privacy Settings
- **URL**: `/api/privacy`
- **Method**: `GET`
- **Description**: Returns the currently authenticated user's privacy settings
- **Authentication**: Required
- **Response Example**:
  ```json
  {
    "id": 1,
    "userId": 123,
    "showLocation": true,
    "showProfile": true,
    "allowLocationTracking": true,
    "createdAt": "2023-10-27T10:00:00.000Z",
    "updatedAt": "2023-10-27T10:00:00.000Z"
  }
  ```

### Update Privacy Settings
- **URL**: `/api/privacy`
- **Method**: `POST`
- **Description**: Updates the user's privacy settings
- **Authentication**: Required
- **Request Body Example**:
  ```json
  {
    "showLocation": false,
    "showProfile": true,
    "allowLocationTracking": true
  }
  ```
- **Response**: Updated privacy settings object

## Review Endpoints

### Create Review
- **URL**: `/api/reviews`
- **Method**: `POST`
- **Description**: Creates a review for a user or job
- **Authentication**: Required
- **Request Body Example**:
  ```json
  {
    "jobId": 789,
    "reviewerId": 123,
    "revieweeId": 456,
    "rating": 5,
    "comment": "Excellent work, very professional and fast."
  }
  ```
- **Response**: Created review object

### Get Reviews for User
- **URL**: `/api/reviews/user/:userId`
- **Method**: `GET`
- **Description**: Returns all reviews for a specific user
- **Parameters**:
  - `userId` (path): User ID
- **Response**: Array of review objects

## Error Codes

The API uses standard HTTP status codes:

- **200 OK**: The request was successful
- **201 Created**: A resource was successfully created
- **400 Bad Request**: The request was malformed or invalid
- **401 Unauthorized**: Authentication is required or failed
- **403 Forbidden**: The user lacks sufficient permissions
- **404 Not Found**: The requested resource was not found
- **422 Unprocessable Entity**: Location verification failed or other validation error
- **500 Internal Server Error**: An unexpected server error occurred

## Rate Limiting

API requests are limited to 100 requests per minute per IP address or authenticated user. Exceeding this limit will result in a 429 Too Many Requests response.

## Security Features

### Location Verification
- GPS accuracy validation (requires <100m accuracy)
- Distance verification (500m for job start, 1000m during work)
- Anti-spoofing measures including speed analysis and device fingerprinting
- Continuous monitoring during job execution

### Content Security
- Automated content filtering for inappropriate material
- SQL injection prevention with parameterized queries
- XSS protection with input sanitization
- CSRF protection for state-changing operations

### Payment Security
- Stripe Connect integration with secure payment processing
- Payment intent validation and confirmation
- Webhook signature verification
- Transaction audit logging