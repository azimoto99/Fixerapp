# The Job - API Documentation

## API Overview

The Job platform provides a comprehensive REST API for interacting with jobs, users, applications, payments, and more. This documentation outlines the available endpoints, request/response formats, and authentication requirements.

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

### Set Account Type
- **URL**: `/api/set-account-type`
- **Method**: `POST`
- **Description**: Sets or changes the user's account type
- **Request Body Example**:
  ```json
  {
    "accountType": "worker"  // or "poster"
  }
  ```
- **Response**: Updated user object

## Privacy Endpoints

### Get Privacy Settings
- **URL**: `/api/privacy`
- **Method**: `GET`
- **Description**: Returns the currently authenticated user's privacy settings.
- **Authentication**: Required
- **Response Example**:
  ```json
  {
    "id": 1,
    "userId": 123,
    "show_location": true,
    "show_profile": true,
    "createdAt": "2023-10-27T10:00:00.000Z",
    "updatedAt": "2023-10-27T10:00:00.000Z"
  }
  ```

### Update Privacy Settings
- **URL**: `/api/privacy`
- **Method**: `POST`
- **Description**: Updates the user's privacy settings.
- **Authentication**: Required
- **Request Body Example**:
  ```json
  {
    "showLocation": false,
    "showProfile": true
  }
  ```
- **Response**: Updated privacy settings object.

## Job Endpoints

### Get All Jobs
- **URL**: `/api/jobs`
- **Method**: `GET`
- **Description**: Returns a list of jobs, filterable by various parameters
- **Query Parameters**:
  - `posterId` (optional): Filter by job poster ID
  - `status` (optional): Filter by job status ("open", "assigned", "completed")
  - `category` (optional): Filter by job category
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
- **Authentication**: Required, user must have "poster" account type
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
    "requiredSkills": ["plumbing"]
  }
  ```
- **Response**: Created job object. The `latitude` and `longitude` values are encrypted at rest and will not be returned in this response.

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

### Get Nearby Jobs
- **URL**: `/api/jobs/nearby/location`
- **Method**: `GET`
- **Description**: Returns jobs near a specific location within a given radius
- **Query Parameters**:
  - `latitude`: Latitude coordinate
  - `longitude`: Longitude coordinate
  - `radius` (optional): Search radius in miles, defaults to 2
- **Response**: Array of job objects with distance information

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
    "workerId": 456,
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

### Update Application
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

### Update Payment Status
- **URL**: `/api/payments/:id/status`
- **Method**: `PATCH`
- **Description**: Updates a payment's status
- **Authentication**: Required, must be admin or involved in the payment
- **Parameters**:
  - `id` (path): Payment ID
- **Request Body Example**:
  ```json
  {
    "status": "completed",
    "transactionId": "txn_789xyz"
  }
  ```
- **Response**: Updated payment object

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

### Get Reviews for Job
- **URL**: `/api/reviews/job/:jobId`
- **Method**: `GET`
- **Description**: Returns all reviews for a specific job
- **Parameters**:
  - `jobId` (path): Job ID
- **Response**: Array of review objects

## Error Codes

The API uses standard HTTP status codes:

- **200 OK**: The request was successful
- **201 Created**: A resource was successfully created
- **400 Bad Request**: The request was malformed or invalid
- **401 Unauthorized**: Authentication is required or failed
- **403 Forbidden**: The user lacks sufficient permissions
- **404 Not Found**: The requested resource was not found
- **500 Internal Server Error**: An unexpected server error occurred

## Rate Limiting

API requests are limited to 100 requests per minute per IP address or authenticated user. Exceeding this limit will result in a 429 Too Many Requests response.