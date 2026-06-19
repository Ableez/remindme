import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

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

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reminders")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(200);
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.db.insert("reminders", {
      projectId: args.projectId,
      userId: identity.tokenIdentifier,
      title: args.title,
      description: args.description,
      completed: false,
      dueDate: args.dueDate,
      priority: args.priority,
      remindBeforeMinutes: args.remindBeforeMinutes ?? 5,
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
    await ctx.db.patch(args.reminderId, {
      completed: !reminder.completed,
      completedAt: !reminder.completed ? Date.now() : undefined,
    });
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
