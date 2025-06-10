# Contact Request System Implementation

## Overview
Implemented a complete contact request system to replace the direct contact addition. Users now send contact requests that must be accepted before becoming contacts, providing better privacy and control.

## 🔧 **1. Database Schema**
The contact request system uses the existing `contactRequests` table from the schema:

```sql
contactRequests {
  id: serial (primary key)
  senderId: integer (references users.id)
  receiverId: integer (references users.id)
  status: text (default: "pending") // "pending", "accepted", "rejected"
  message: text (optional message with request)
  createdAt: timestamp
  updatedAt: timestamp
}
```

## 🔧 **2. Storage Methods Added**

### **File**: `server/unified-storage.ts`

#### A. `createContactRequest(senderId, receiverId, message?)`
- **Validates**: No duplicate pending requests
- **Validates**: Users aren't already contacts
- **Creates**: New contact request with pending status
- **Returns**: Created request object

#### B. `getContactRequests(userId, type: 'sent' | 'received')`
- **Fetches**: Contact requests for user
- **Joins**: With users table for complete user info
- **Filters**: By sent or received requests
- **Orders**: By creation date (newest first)

#### C. `updateContactRequestStatus(requestId, status, userId)`
- **Validates**: Request exists and user can respond
- **Updates**: Request status to accepted/rejected
- **Auto-creates**: Bidirectional contact relationship if accepted
- **Returns**: Updated request object

## 🔧 **3. API Endpoints Added**

### **File**: `server/api/messaging-api.ts`

#### A. `POST /api/contact-requests/send`
- **Purpose**: Send contact request to another user
- **Body**: `{ receiverId: number, message?: string }`
- **Validation**: Prevents self-requests and duplicates
- **Response**: Success message and request details

#### B. `GET /api/contact-requests?type=sent|received`
- **Purpose**: Get contact requests (sent or received)
- **Query**: `type` parameter for filtering
- **Response**: Array of requests with user details
- **Security**: User can only see their own requests

#### C. `PUT /api/contact-requests/:requestId`
- **Purpose**: Accept or reject contact request
- **Body**: `{ status: 'accepted' | 'rejected' }`
- **Validation**: Only receiver can respond
- **Auto-action**: Creates contacts if accepted

## 🔧 **4. UI/UX Implementation**

### **File**: `client/src/components/MessagingDrawer.tsx`

#### A. Enhanced Tab System
- **3 Tabs**: Contacts, Requests, Find Users
- **Badge Indicators**: Show pending request count
- **Visual Hierarchy**: Clear separation of functionality

#### B. Contact Requests Tab
- **Received Requests Section**:
  - Shows pending requests from other users
  - Displays user info and optional message
  - Accept/Decline buttons with loading states
  - Empty state for no requests

- **Sent Requests Section**:
  - Shows requests user has sent
  - Displays pending status
  - Read-only view of outgoing requests

#### C. Updated Search Functionality
- **Changed**: "Add Contact" → "Send Request"
- **Behavior**: Sends contact request instead of direct addition
- **Feedback**: Success/error messages for request sending

## 🔧 **5. Query Management**

### **React Query Integration**
```javascript
// Received requests
queryKey: ['/api/contact-requests', 'received', currentUser?.id]

// Sent requests  
queryKey: ['/api/contact-requests', 'sent', currentUser?.id]

// Auto-invalidation on actions
queryClient.invalidateQueries({ queryKey: ['/api/contact-requests', ...] })
queryClient.invalidateQueries({ queryKey: ['/api/contacts', ...] })
```

### **Real-time Updates**
- **Polling**: 30-second stale time for requests
- **Window Focus**: Refetch on window focus
- **Action-based**: Immediate invalidation after mutations

## 🔧 **6. Security Features**

### **Server-side Validation**
- **Authentication**: All endpoints require login
- **Authorization**: Users can only access their own requests
- **Ownership**: Only receivers can accept/reject requests
- **Duplicate Prevention**: No duplicate pending requests

### **Client-side Security**
- **User Validation**: Prevents self-requests
- **State Management**: Secure query keys per user
- **Error Handling**: Comprehensive error states

## 🔧 **7. User Experience Flow**

### **Sending Contact Request**
1. User searches for other users
2. Clicks "Send Request" button
3. Request is sent with optional message
4. Success feedback and redirect to requests tab
5. Request appears in sender's "Sent Requests"

### **Receiving Contact Request**
1. Request appears in "Requests" tab with badge
2. User sees sender info and message
3. User can Accept or Decline
4. If accepted: Both users become contacts
5. If declined: Request is marked rejected

### **Contact Creation (Auto)**
When request is accepted:
1. Bidirectional contact relationship created
2. Both users see each other in contacts
3. Messaging becomes available
4. Request removed from pending list

## 🔧 **8. Visual Design**

### **Request Cards**
- **Professional Layout**: Avatar, name, username, message
- **Action Buttons**: Green accept, outlined decline
- **Status Indicators**: Timestamps and status badges
- **Loading States**: Disabled buttons during actions

### **Empty States**
- **No Requests**: Encouraging message with mail icon
- **Loading**: Skeleton animations
- **Error States**: Clear error messages

### **Badge System**
- **Pending Count**: Red badge on requests tab
- **Contact Count**: Secondary badge on contacts tab
- **Status Indicators**: Visual feedback throughout

## 🔧 **9. Error Handling**

### **Common Error Scenarios**
- **Duplicate Request**: "Contact request already sent"
- **Already Contacts**: "User is already a contact"
- **Self Request**: "Cannot send contact request to yourself"
- **Invalid Request**: "Contact request not found"
- **Permission Denied**: "You can only respond to requests sent to you"

### **User Feedback**
- **Toast Notifications**: Success and error messages
- **Loading States**: Visual feedback during actions
- **Disabled States**: Prevent multiple submissions

## 🔧 **10. Performance Optimizations**

### **Efficient Queries**
- **Joined Queries**: Single query for request + user data
- **Indexed Lookups**: Fast request retrieval
- **Pagination Ready**: Structure supports future pagination

### **Cache Management**
- **Smart Invalidation**: Only invalidate relevant queries
- **Stale Time**: Appropriate cache durations
- **Background Updates**: Seamless data refresh

## 🔧 **11. Future Enhancements**

### **Potential Improvements**
- **Message with Request**: Optional message when sending
- **Request Expiration**: Auto-expire old requests
- **Bulk Actions**: Accept/decline multiple requests
- **Notification System**: Real-time request notifications

### **Analytics Potential**
- **Request Metrics**: Track acceptance rates
- **User Behavior**: Monitor request patterns
- **Spam Prevention**: Detect excessive requests

## ✅ **Summary**

The contact request system provides:

1. **✅ Privacy Control**: Users must approve contacts
2. **✅ Better UX**: Clear request/response flow
3. **✅ Security**: Proper validation and authorization
4. **✅ Real-time Updates**: Live request status
5. **✅ Professional UI**: Modern, intuitive interface

### **Key Benefits**
- **User Privacy**: No unwanted contacts
- **Clear Communication**: Optional messages with requests
- **Audit Trail**: Track all contact interactions
- **Scalable Design**: Ready for future enhancements

The system now properly handles contact requests with a complete UI for sending, receiving, and managing requests, providing users with full control over their contact list.
