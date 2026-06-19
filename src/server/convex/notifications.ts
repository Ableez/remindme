"use node";

import webPush from "web-push";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api } from "./_generated/api";

function configureWebPush() {
  webPush.setVapidDetails(
    "mailto:remindme@astexlabs.dev",
    process.env.VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? ""
  );
}

export const sendPush = internalAction({
  args: {
    subscription: v.string(),
    title: v.string(),
    body: v.string(),
    url: v.optional(v.string()),
    tag: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    configureWebPush();
    try {
      const sub = JSON.parse(args.subscription);
      await webPush.sendNotification(
        sub,
        JSON.stringify({
          title: args.title,
          body: args.body,
          url: args.url ?? "/",
          tag: args.tag ?? "remindme",
        })
      );
    } catch (e) {
      console.error("Push send failed:", e);
    }
  },
});

export const sendReminderPush = internalAction({
  args: {
    userId: v.string(),
    reminderTitle: v.string(),
    projectRepoName: v.string(),
    projectId: v.string(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(api.settings.getByUserId, {
      userId: args.userId,
    });
    if (!settings?.pushEnabled || !settings.pushSubscription) return;

    await ctx.runAction(internal.notifications.sendPush, {
      subscription: settings.pushSubscription,
      title: `Reminder: ${args.reminderTitle}`,
      body: `Project: ${args.projectRepoName}`,
      url: `/projects/${args.projectId}`,
      tag: `reminder-${args.reminderTitle}`,
    });
  },
});

export const sendCatchupPush = internalAction({
  args: {
    userId: v.string(),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(api.settings.getByUserId, {
      userId: args.userId,
    });
    if (!settings?.pushEnabled || !settings.pushSubscription) return;

    await ctx.runAction(internal.notifications.sendPush, {
      subscription: settings.pushSubscription,
      title: "Daily Catchup",
      body: args.summary.substring(0, 200),
      url: "/",
      tag: "daily-catchup",
    });
  },
});

export const testPush = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const settings = await ctx.runQuery(api.settings.getByUserId, {
      userId: identity.tokenIdentifier,
    });
    if (!settings?.pushSubscription) {
      throw new Error("No push subscription. Enable push in settings first.");
    }

    await ctx.runAction(internal.notifications.sendPush, {
      subscription: settings.pushSubscription,
      title: "Test Notification",
      body: "Push notifications are working!",
      url: "/settings",
      tag: "test-push",
    });

    return { success: true };
  },
});
