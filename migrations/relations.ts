import { relations } from "drizzle-orm/relations";
import { users, adminUsers, contactRequests, jobs, messages, refunds, disputes, supportMessages, supportTickets, userReports, userStrikes, adminAuditLog, platformSettings, systemAlerts } from "./schema";

export const adminUsersRelations = relations(adminUsers, ({one, many}) => ({
	user_createdBy: one(users, {
		fields: [adminUsers.createdBy],
		references: [users.id],
		relationName: "adminUsers_createdBy_users_id"
	}),
	user_userId: one(users, {
		fields: [adminUsers.userId],
		references: [users.id],
		relationName: "adminUsers_userId_users_id"
	}),
	userReports: many(userReports),
	userStrikes: many(userStrikes),
	adminAuditLogs: many(adminAuditLog),
	platformSettings: many(platformSettings),
	systemAlerts: many(systemAlerts),
}));

export const usersRelations = relations(users, ({many}) => ({
	adminUsers_createdBy: many(adminUsers, {
		relationName: "adminUsers_createdBy_users_id"
	}),
	adminUsers_userId: many(adminUsers, {
		relationName: "adminUsers_userId_users_id"
	}),
	contactRequests_receiverId: many(contactRequests, {
		relationName: "contactRequests_receiverId_users_id"
	}),
	contactRequests_senderId: many(contactRequests, {
		relationName: "contactRequests_senderId_users_id"
	}),
	messages_recipientId: many(messages, {
		relationName: "messages_recipientId_users_id"
	}),
	messages_senderId: many(messages, {
		relationName: "messages_senderId_users_id"
	}),
	refunds: many(refunds),
	disputes_against: many(disputes, {
		relationName: "disputes_against_users_id"
	}),
	disputes_raisedBy: many(disputes, {
		relationName: "disputes_raisedBy_users_id"
	}),
	disputes_resolvedBy: many(disputes, {
		relationName: "disputes_resolvedBy_users_id"
	}),
	supportMessages: many(supportMessages),
	supportTickets_assignedTo: many(supportTickets, {
		relationName: "supportTickets_assignedTo_users_id"
	}),
	supportTickets_userId: many(supportTickets, {
		relationName: "supportTickets_userId_users_id"
	}),
	userReports_reportedUserId: many(userReports, {
		relationName: "userReports_reportedUserId_users_id"
	}),
	userReports_reporterId: many(userReports, {
		relationName: "userReports_reporterId_users_id"
	}),
	userStrikes: many(userStrikes),
}));

export const contactRequestsRelations = relations(contactRequests, ({one}) => ({
	user_receiverId: one(users, {
		fields: [contactRequests.receiverId],
		references: [users.id],
		relationName: "contactRequests_receiverId_users_id"
	}),
	user_senderId: one(users, {
		fields: [contactRequests.senderId],
		references: [users.id],
		relationName: "contactRequests_senderId_users_id"
	}),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	job: one(jobs, {
		fields: [messages.jobId],
		references: [jobs.id]
	}),
	user_recipientId: one(users, {
		fields: [messages.recipientId],
		references: [users.id],
		relationName: "messages_recipientId_users_id"
	}),
	user_senderId: one(users, {
		fields: [messages.senderId],
		references: [users.id],
		relationName: "messages_senderId_users_id"
	}),
}));

export const jobsRelations = relations(jobs, ({many}) => ({
	messages: many(messages),
	refunds: many(refunds),
	disputes: many(disputes),
	supportTickets: many(supportTickets),
	userReports: many(userReports),
	userStrikes: many(userStrikes),
}));

export const refundsRelations = relations(refunds, ({one}) => ({
	job: one(jobs, {
		fields: [refunds.jobId],
		references: [jobs.id]
	}),
	user: one(users, {
		fields: [refunds.userId],
		references: [users.id]
	}),
}));

export const disputesRelations = relations(disputes, ({one}) => ({
	user_against: one(users, {
		fields: [disputes.against],
		references: [users.id],
		relationName: "disputes_against_users_id"
	}),
	job: one(jobs, {
		fields: [disputes.jobId],
		references: [jobs.id]
	}),
	user_raisedBy: one(users, {
		fields: [disputes.raisedBy],
		references: [users.id],
		relationName: "disputes_raisedBy_users_id"
	}),
	user_resolvedBy: one(users, {
		fields: [disputes.resolvedBy],
		references: [users.id],
		relationName: "disputes_resolvedBy_users_id"
	}),
}));

export const supportMessagesRelations = relations(supportMessages, ({one}) => ({
	user: one(users, {
		fields: [supportMessages.senderId],
		references: [users.id]
	}),
	supportTicket: one(supportTickets, {
		fields: [supportMessages.ticketId],
		references: [supportTickets.id]
	}),
}));

export const supportTicketsRelations = relations(supportTickets, ({one, many}) => ({
	supportMessages: many(supportMessages),
	user_assignedTo: one(users, {
		fields: [supportTickets.assignedTo],
		references: [users.id],
		relationName: "supportTickets_assignedTo_users_id"
	}),
	job: one(jobs, {
		fields: [supportTickets.jobId],
		references: [jobs.id]
	}),
	user_userId: one(users, {
		fields: [supportTickets.userId],
		references: [users.id],
		relationName: "supportTickets_userId_users_id"
	}),
}));

export const userReportsRelations = relations(userReports, ({one}) => ({
	adminUser: one(adminUsers, {
		fields: [userReports.assignedTo],
		references: [adminUsers.id]
	}),
	job: one(jobs, {
		fields: [userReports.jobId],
		references: [jobs.id]
	}),
	user_reportedUserId: one(users, {
		fields: [userReports.reportedUserId],
		references: [users.id],
		relationName: "userReports_reportedUserId_users_id"
	}),
	user_reporterId: one(users, {
		fields: [userReports.reporterId],
		references: [users.id],
		relationName: "userReports_reporterId_users_id"
	}),
}));

export const userStrikesRelations = relations(userStrikes, ({one}) => ({
	adminUser: one(adminUsers, {
		fields: [userStrikes.adminId],
		references: [adminUsers.id]
	}),
	job: one(jobs, {
		fields: [userStrikes.jobId],
		references: [jobs.id]
	}),
	user: one(users, {
		fields: [userStrikes.userId],
		references: [users.id]
	}),
}));

export const adminAuditLogRelations = relations(adminAuditLog, ({one}) => ({
	adminUser: one(adminUsers, {
		fields: [adminAuditLog.adminId],
		references: [adminUsers.id]
	}),
}));

export const platformSettingsRelations = relations(platformSettings, ({one}) => ({
	adminUser: one(adminUsers, {
		fields: [platformSettings.updatedBy],
		references: [adminUsers.id]
	}),
}));

export const systemAlertsRelations = relations(systemAlerts, ({one}) => ({
	adminUser: one(adminUsers, {
		fields: [systemAlerts.resolvedBy],
		references: [adminUsers.id]
	}),
}));