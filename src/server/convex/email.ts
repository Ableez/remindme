"use node";

import { Resend } from "resend";
import { v } from "convex/values";
import { action } from "./_generated/server";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export const sendReminderEmail = action({
  args: {
    to: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    projectRepoName: v.string(),
  },
  handler: async (_ctx, args) => {
    const { error } = await getResend().emails.send({
      from: "RemindMe <onboarding@resend.dev>",
      to: args.to,
      subject: `Reminder: ${args.title}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 8px;">⏰ ${args.title}</h2>
          <p style="color: #666; margin: 0 0 4px 0; font-size: 14px;">Project: ${args.projectRepoName}</p>
          ${args.description ? `<p style="color: #444; margin: 12px 0 0 0;">${args.description}</p>` : ""}
        </div>
      `,
    });

    if (error) {
      throw new Error(`Resend error: ${JSON.stringify(error)}`);
    }
  },
});

export const sendCatchupEmail = action({
  args: {
    to: v.string(),
    date: v.string(),
    html: v.string(),
  },
  handler: async (_ctx, args) => {
    const { error } = await getResend().emails.send({
      from: "RemindMe <onboarding@resend.dev>",
      to: args.to,
      subject: `Daily Catchup — ${args.date}`,
      html: args.html,
    });

    if (error) {
      throw new Error(`Resend error: ${JSON.stringify(error)}`);
    }
  },
});
