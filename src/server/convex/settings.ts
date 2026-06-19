import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const settings = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .unique();
    return settings;
  },
});

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const _getAllEnabledUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("userSettings")
      .filter((q) => q.eq(q.field("dailyCatchupEnabled"), true))
      .take(100);
  },
});

export const update = mutation({
  args: {
    email: v.optional(v.string()),
    dailyCatchupEnabled: v.optional(v.boolean()),
    reminderEmailEnabled: v.optional(v.boolean()),
    pushEnabled: v.optional(v.boolean()),
    pushSubscription: v.optional(v.string()),
    defaultNoteColor: v.optional(v.string()),
    githubToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .unique();

    const updates: Record<string, unknown> = {};
    if (args.email !== undefined) updates.email = args.email;
    if (args.dailyCatchupEnabled !== undefined)
      updates.dailyCatchupEnabled = args.dailyCatchupEnabled;
    if (args.reminderEmailEnabled !== undefined)
      updates.reminderEmailEnabled = args.reminderEmailEnabled;
    if (args.pushEnabled !== undefined)
      updates.pushEnabled = args.pushEnabled;
    if (args.pushSubscription !== undefined)
      updates.pushSubscription = args.pushSubscription;
    if (args.defaultNoteColor !== undefined)
      updates.defaultNoteColor = args.defaultNoteColor;
    if (args.githubToken !== undefined)
      updates.githubToken = args.githubToken;

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("userSettings", {
        userId: identity.tokenIdentifier,
        email: args.email ?? "",
        dailyCatchupEnabled: args.dailyCatchupEnabled ?? true,
        reminderEmailEnabled: args.reminderEmailEnabled ?? true,
        pushEnabled: args.pushEnabled ?? false,
        pushSubscription: args.pushSubscription,
        defaultNoteColor: args.defaultNoteColor ?? "#fbbf24",
        githubToken: args.githubToken,
      });
    }
  },
});

export const ensureSettings = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }
    const existing = await ctx.db
      .query("userSettings")
      .withIndex("by_userId", (q) =>
        q.eq("userId", identity.tokenIdentifier)
      )
      .unique();

    if (!existing) {
      const email =
        identity.email ??
        (identity as Record<string, unknown>).email_addresses
          ? (
              (identity as Record<string, unknown>).email_addresses as Array<{
                email_address: string;
              }>
            )?.[0]?.email_address ?? ""
          : "";
      await ctx.db.insert("userSettings", {
        userId: identity.tokenIdentifier,
        email,
        dailyCatchupEnabled: true,
        reminderEmailEnabled: true,
        pushEnabled: false,
        defaultNoteColor: "#fbbf24",
      });
    }
  },
});
