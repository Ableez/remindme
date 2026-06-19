import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", identity.tokenIdentifier))
      .take(50);
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== identity.tokenIdentifier) {
      return null;
    }
    return project;
  },
});

export const create = mutation({
  args: {
    repoId: v.number(),
    repoName: v.string(),
    repoOwner: v.string(),
    repoUrl: v.string(),
    description: v.optional(v.string()),
    isPrivate: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.db.insert("projects", {
      userId: identity.tokenIdentifier,
      repoId: args.repoId,
      repoName: args.repoName,
      repoOwner: args.repoOwner,
      repoUrl: args.repoUrl,
      description: args.description,
      isPrivate: args.isPrivate,
    });
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== identity.tokenIdentifier) {
      throw new Error("Project not found");
    }
    await ctx.db.patch(args.projectId, {
      description: args.description,
    });
  },
});

export const listByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(50);
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== identity.tokenIdentifier) {
      throw new Error("Project not found");
    }

    // Delete all notes for this project
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const note of notes) {
      await ctx.db.delete(note._id);
    }

    // Delete all reminders for this project
    const reminders = await ctx.db
      .query("reminders")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const reminder of reminders) {
      await ctx.db.delete(reminder._id);
    }

    // Delete all agent conversations for this project
    const conversations = await ctx.db
      .query("agentConversations")
      .withIndex("by_projectId_and_userId", (q) =>
        q
          .eq("projectId", args.projectId)
          .eq("userId", identity.tokenIdentifier)
      )
      .collect();
    for (const conv of conversations) {
      const messages = await ctx.db
        .query("agentMessages")
        .withIndex("by_conversationId", (q) =>
          q.eq("conversationId", conv._id)
        )
        .collect();
      for (const msg of messages) {
        await ctx.db.delete(msg._id);
      }
      await ctx.db.delete(conv._id);
    }

    await ctx.db.delete(args.projectId);
  },
});
