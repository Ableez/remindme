import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const list = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.db
      .query("notes")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(100);
  },
});

export const get = query({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      return null;
    }
    return note;
  },
});

export const create = mutation({
  args: {
    projectId: v.id("projects"),
    content: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const existing = await ctx.db
      .query("notes")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(1);
    const nextOrder = existing.length > 0 ? (existing[0].order ?? 0) + 1 : 0;
    return await ctx.db.insert("notes", {
      projectId: args.projectId,
      userId: identity.tokenIdentifier,
      content: args.content,
      color: args.color,
      pinned: false,
      order: nextOrder,
    });
  },
});

export const update = mutation({
  args: {
    noteId: v.id("notes"),
    content: v.optional(v.string()),
    color: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      throw new Error("Note not found");
    }
    const updates: Record<string, unknown> = {};
    if (args.content !== undefined) updates.content = args.content;
    if (args.color !== undefined) updates.color = args.color;
    if (args.pinned !== undefined) updates.pinned = args.pinned;
    await ctx.db.patch(args.noteId, updates);
  },
});

export const reorder = mutation({
  args: {
    noteIds: v.array(v.id("notes")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    for (let i = 0; i < args.noteIds.length; i++) {
      const note = await ctx.db.get(args.noteIds[i]);
      if (note && note.userId === identity.tokenIdentifier) {
        await ctx.db.patch(args.noteIds[i], { order: i });
      }
    }
  },
});

export const remove = mutation({
  args: { noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const note = await ctx.db.get(args.noteId);
    if (!note || note.userId !== identity.tokenIdentifier) {
      throw new Error("Note not found");
    }
    await ctx.db.delete(args.noteId);
  },
});

export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notes")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .take(100);
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    return await ctx.db
      .query("notes")
      .withSearchIndex("search_content", (q) =>
        q.search("content", args.query).eq("userId", identity.tokenIdentifier)
      )
      .take(20);
  },
});
