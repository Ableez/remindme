import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  projects: defineTable({
    userId: v.string(),
    repoId: v.number(),
    repoName: v.string(),
    repoOwner: v.string(),
    repoUrl: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
    lastSyncedAt: v.optional(v.number()),
  }).index("by_userId", ["userId"]),

  notes: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    content: v.string(),
    color: v.string(),
  })
    .index("by_projectId", ["projectId"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["userId"],
    }),

  reminders: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    dueDate: v.optional(v.number()),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    remindBeforeMinutes: v.number(),
  })
    .index("by_projectId", ["projectId"])
    .index("by_userId_and_completed", ["userId", "completed"]),

  userSettings: defineTable({
    userId: v.string(),
    email: v.string(),
    dailyCatchupEnabled: v.boolean(),
    reminderEmailEnabled: v.boolean(),
    pushEnabled: v.boolean(),
    pushSubscription: v.optional(v.string()),
    defaultNoteColor: v.string(),
    githubToken: v.optional(v.string()),
  }).index("by_userId", ["userId"]),

  agentConversations: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
  }).index("by_projectId_and_userId", ["projectId", "userId"]),

  agentMessages: defineTable({
    conversationId: v.id("agentConversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    actionTaken: v.optional(v.string()),
  }).index("by_conversationId", ["conversationId"]),

  dailySummaries: defineTable({
    userId: v.string(),
    date: v.string(),
    html: v.string(),
  }).index("by_userId_and_date", ["userId", "date"]),
});
