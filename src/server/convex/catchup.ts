"use node";

import OpenAI from "openai";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

function getOpenAI() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}

const CATCHUP_SYSTEM_PROMPT = `You are RemindMe's daily catchup bot. You have a quirky, genius personality. You speak in short, punchy sentences. No fluff. Be helpful and insightful — connect the dots between notes, reminders, and code activity. Keep each project summary to 2-3 sentences max.`;

export const generateForUser = internalAction({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const projects = await ctx.runQuery(api.projects.listByUserId, {
      userId: args.userId,
    });
    if (!projects || projects.length === 0) return;

    const settings = await ctx.runQuery(api.settings.getByUserId, {
      userId: args.userId,
    });
    if (!settings || !settings.dailyCatchupEnabled || !settings.email) return;

    const oneDayAgo = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();

    const projectSummaries: string[] = [];

    for (const project of projects) {
      const notes = await ctx.runQuery(api.notes.listByProject, {
        projectId: project._id,
      });
      const reminders = await ctx.runQuery(api.reminders.listByProject, {
        projectId: project._id,
      });

      const completedToday = (reminders as Array<{ completed: boolean; completedAt?: number; title: string }>).filter(
        (r) => r.completed && r.completedAt && r.completedAt > Date.now() - 86400000
      );
      const pending = (reminders as Array<{ completed: boolean; title: string; dueDate?: number }>).filter((r) => !r.completed);
      const recentNotes = (notes as Array<{ _creationTime: number; content: string }>).filter(
        (n) => n._creationTime > Date.now() - 86400000
      );

      let commits: Array<{ sha: string; message: string; author: string }> = [];
      if (settings.githubToken) {
        try {
          commits = await ctx.runAction(api.github.fetchCommits, {
            githubToken: settings.githubToken,
            owner: project.repoOwner,
            repo: project.repoName,
            since: oneDayAgo,
          });
        } catch {
          // Token might be expired, skip commits
        }
      }

      const prompt = `Project: ${project.repoName}

Notes created today (${recentNotes.length}):
${recentNotes.map((n) => `- ${n.content.substring(0, 100)}`).join("\n") || "None"}

Reminders completed today (${completedToday.length}):
${completedToday.map((r) => `- ${r.title}`).join("\n") || "None"}

Pending reminders (${pending.length}):
${pending.map((r) => `- ${r.title}${r.dueDate ? ` (due ${new Date(r.dueDate).toLocaleDateString()})` : ""}`).join("\n") || "None"}

GitHub commits (${commits.length}):
${commits.map((c) => `- ${c.sha}: ${c.message}`).join("\n") || "None"}

Summarize this project's day in 2-3 short sentences. Connect the dots.`;

      projectSummaries.push(prompt);
    }

    const fullPrompt = projectSummaries.join("\n\n---\n\n");

    const response = await getOpenAI().chat.completions.create({
      model: "openrouter/owl-alpha",
      messages: [
        { role: "system", content: CATCHUP_SYSTEM_PROMPT },
        { role: "user", content: fullPrompt },
      ],
    });

    const summary = response.choices[0].message.content ?? "Nothing to report.";

    const today = new Date().toISOString().split("T")[0];
    const html = buildCatchupHtml(today, summary, projects);

    await ctx.runAction(api.email.sendCatchupEmail, {
      to: settings.email,
      date: today,
      html,
    });

    await ctx.runMutation(api.catchup_helpers._storeSummary, {
      userId: args.userId,
      date: today,
      html,
    });
  },
});

export const runAll = internalAction({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.runQuery(api.settings._getAllEnabledUsers);
    for (const user of users) {
      try {
        await ctx.runAction(internal.catchup.generateForUser, {
          userId: user.userId,
        });
      } catch (e) {
        console.error(`Failed catchup for ${user.userId}:`, e);
      }
    }
  },
});

function buildCatchupHtml(
  date: string,
  summary: string,
  projects: Array<{ repoName: string }>
): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
      <h1 style="color: #333; font-size: 24px; margin-bottom: 4px;">Daily Catchup</h1>
      <p style="color: #888; font-size: 14px; margin: 0 0 20px 0;">${date}</p>
      <div style="background: white; border-radius: 8px; padding: 20px; border: 1px solid #eee;">
        <p style="color: #333; line-height: 1.6; white-space: pre-wrap;">${summary}</p>
      </div>
      <p style="color: #aaa; font-size: 12px; margin-top: 16px;">Projects: ${projects.map((p) => p.repoName).join(", ")}</p>
    </div>
  `;
}
