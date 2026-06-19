import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const _storeSummary = mutation({
  args: {
    userId: v.string(),
    date: v.string(),
    html: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("dailySummaries", {
      userId: args.userId,
      date: args.date,
      html: args.html,
    });
  },
});
