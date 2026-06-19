import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getConversation = query({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const conversation = await ctx.db
      .query("agentConversations")
      .withIndex("by_projectId_and_userId", (q) =>
        q
          .eq("projectId", args.projectId)
          .eq("userId", identity.tokenIdentifier)
      )
      .unique();

    if (!conversation) {
      return { conversation: null, messages: [] };
    }

    const messages = await ctx.db
      .query("agentMessages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", conversation._id)
      )
      .take(50);

    return { conversation, messages };
  },
});

export const _getOrCreateConversation = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("agentConversations")
      .withIndex("by_projectId_and_userId", (q) =>
        q
          .eq("projectId", args.projectId)
          .eq("userId", identity.tokenIdentifier)
      )
      .unique();
  },
});

export const _createConversation = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const id = await ctx.db.insert("agentConversations", {
      projectId: args.projectId,
      userId: identity.tokenIdentifier,
    });
    return await ctx.db.get(id);
  },
});

export const _storeMessage = mutation({
  args: {
    conversationId: v.id("agentConversations"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    actionTaken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("agentMessages", {
      conversationId: args.conversationId,
      role: args.role,
      content: args.content,
      actionTaken: args.actionTaken,
    });
  },
});

export const _getHistory = query({
  args: { conversationId: v.id("agentConversations") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentMessages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .take(50);
  },
});
