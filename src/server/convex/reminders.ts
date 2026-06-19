import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const list = query({
  args: {
    projectId: v.id("projects"),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const results = await ctx.db
      .query("reminders")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(200);

    if (args.completed !== undefined) {
      return results.filter((r) => r.completed === args.completed);
    }
    return results;
  },
});

export const get = query({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder || reminder.userId !== identity.tokenIdentifier) {
      return null;
    }
    return reminder;
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    remindBeforeMinutes: v.optional(v.number()),
    recurring: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("monthly")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const existing = await ctx.db
      .query("reminders")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(1);
    const nextOrder = existing.length > 0 ? (existing[0].order ?? 0) + 1 : 0;
    return await ctx.db.insert("reminders", {
      projectId: args.projectId,
      userId: identity.tokenIdentifier,
      title: args.title,
      description: args.description,
      completed: false,
      dueDate: args.dueDate,
      priority: args.priority,
      remindBeforeMinutes: args.remindBeforeMinutes ?? 5,
      order: nextOrder,
      recurring: args.recurring,
    });
  },
});

export const update = mutation({
  args: {
    reminderId: v.id("reminders"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    dueDate: v.optional(v.number()),
    priority: v.optional(
      v.union(v.literal("low"), v.literal("medium"), v.literal("high"))
    ),
    remindBeforeMinutes: v.optional(v.number()),
    recurring: v.optional(
      v.union(
        v.literal("daily"),
        v.literal("weekly"),
        v.literal("monthly")
      )
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder || reminder.userId !== identity.tokenIdentifier) {
      throw new Error("Reminder not found");
    }
    const updates: Record<string, unknown> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.dueDate !== undefined) updates.dueDate = args.dueDate;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.remindBeforeMinutes !== undefined)
      updates.remindBeforeMinutes = args.remindBeforeMinutes;
    if (args.recurring !== undefined) updates.recurring = args.recurring;
    await ctx.db.patch(args.reminderId, updates);
  },
});

export const toggle = mutation({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder || reminder.userId !== identity.tokenIdentifier) {
      throw new Error("Reminder not found");
    }
    const nowCompleted = !reminder.completed;
    await ctx.db.patch(args.reminderId, {
      completed: nowCompleted,
      completedAt: nowCompleted ? Date.now() : undefined,
    });
  },
});

export const completeAll = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(200);
    const now = Date.now();
    for (const r of reminders) {
      if (!r.completed && r.userId === identity.tokenIdentifier) {
        await ctx.db.patch(r._id, { completed: true, completedAt: now });
      }
    }
  },
});

export const deleteCompleted = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(200);
    for (const r of reminders) {
      if (r.completed && r.userId === identity.tokenIdentifier) {
        await ctx.db.delete(r._id);
      }
    }
  },
});

export const reorder = mutation({
  args: {
    reminderIds: v.array(v.id("reminders")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    for (let i = 0; i < args.reminderIds.length; i++) {
      const r = await ctx.db.get(args.reminderIds[i]);
      if (r && r.userId === identity.tokenIdentifier) {
        await ctx.db.patch(args.reminderIds[i], { order: i });
      }
    }
  },
});

export const remove = mutation({
  args: { reminderId: v.id("reminders") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const reminder = await ctx.db.get(args.reminderId);
    if (!reminder || reminder.userId !== identity.tokenIdentifier) {
      throw new Error("Reminder not found");
    }
    await ctx.db.delete(args.reminderId);
  },
});

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reminders")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(200);
  },
});
