"use node";

import OpenAI from "openai";
import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

function getOpenAI() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}

const AGENT_SYSTEM_PROMPT = `You are a project assistant. You manage notes and reminders for a project. Be concise, quirky, genius-level brief. Short sentences. No fluff.

When the user asks you to do something, use the available tools. Always confirm what you did in 1-2 short sentences.`;

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "create_note",
      description: "Create a sticky note in the project",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The note content" },
          color: {
            type: "string",
            description: "Hex color code",
            default: "#fbbf24",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_note",
      description: "Update a note's content or color",
      parameters: {
        type: "object",
        properties: {
          noteId: { type: "string", description: "The note ID" },
          content: { type: "string", description: "New content" },
          color: { type: "string", description: "New hex color" },
        },
        required: ["noteId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_note",
      description: "Delete a note",
      parameters: {
        type: "object",
        properties: {
          noteId: { type: "string", description: "The note ID" },
        },
        required: ["noteId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "create_reminder",
      description: "Create a reminder",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Reminder title" },
          description: { type: "string", description: "Optional description" },
          dueDate: {
            type: "number",
            description: "Due date as Unix timestamp ms",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            default: "medium",
          },
          remindBeforeMinutes: {
            type: "number",
            description: "Minutes before due to remind",
            default: 5,
          },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_reminder",
      description: "Update a reminder's fields",
      parameters: {
        type: "object",
        properties: {
          reminderId: { type: "string", description: "The reminder ID" },
          title: { type: "string" },
          description: { type: "string" },
          dueDate: { type: "number" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
          remindBeforeMinutes: { type: "number" },
        },
        required: ["reminderId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "toggle_reminder",
      description: "Mark a reminder as complete or incomplete",
      parameters: {
        type: "object",
        properties: {
          reminderId: { type: "string", description: "The reminder ID" },
        },
        required: ["reminderId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_reminder",
      description: "Delete a reminder",
      parameters: {
        type: "object",
        properties: {
          reminderId: { type: "string", description: "The reminder ID" },
        },
        required: ["reminderId"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_notes",
      description: "List all notes in the project",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_reminders",
      description: "List all reminders in the project",
      parameters: {
        type: "object",
        properties: {
          completed: {
            type: "boolean",
            description: "Filter by completed status",
          },
        },
      },
    },
  },
];

type AgentResponse = {
  role: string;
  content: string;
  actionTaken?: string;
};

export const sendMessage = action({
  args: {
    projectId: v.id("projects"),
    message: v.string(),
  },
  handler: async (ctx, args): Promise<AgentResponse> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    type Conversation = { _id: Id<"agentConversations"> } | null;

    // Get or create conversation
    let conversation: Conversation = await ctx.runQuery(
      api.agent_helpers._getOrCreateConversation,
      { projectId: args.projectId }
    );

    if (!conversation) {
      conversation = await ctx.runMutation(
        api.agent_helpers._createConversation,
        { projectId: args.projectId }
      );
    }

    if (!conversation) {
      throw new Error("Failed to create conversation");
    }

    const conversationId: Id<"agentConversations"> = conversation._id;

    // Store user message
    await ctx.runMutation(api.agent_helpers._storeMessage, {
      conversationId,
      role: "user",
      content: args.message,
    });

    // Get conversation history
    const history: Array<{ role: string; content: string }> = await ctx.runQuery(
      api.agent_helpers._getHistory,
      { conversationId }
    );

    const historyMessages = history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    // Call LLM
    const response: OpenAI.ChatCompletion = await getOpenAI().chat.completions.create({
      model: "openrouter/owl-alpha",
      messages: [
        { role: "system", content: AGENT_SYSTEM_PROMPT },
        ...historyMessages,
      ],
      tools: TOOLS,
      tool_choice: "auto",
    });

    const choice = response.choices[0];
    const message = choice.message;

    // Handle tool calls
    if (message.tool_calls) {
      const results: string[] = [];
      for (const toolCall of message.tool_calls) {
        if (toolCall.type === "function") {
          const toolArgs = JSON.parse(toolCall.function.arguments);
          const result = await executeToolCall(
            ctx,
            args.projectId,
            toolCall.function.name,
            toolArgs
          );
          results.push(result);
        }
      }

      // Get final response after tool execution
      const toolMessages = message.tool_calls
        .filter((tc) => tc.type === "function")
        .map((tc) => ({
          role: "assistant" as const,
          content: null,
          tool_calls: [tc],
        }));

      const toolResults = message.tool_calls
        .filter((tc) => tc.type === "function")
        .map((tc, i) => ({
          role: "tool" as const,
          tool_call_id: tc.id,
          content: results[i] ?? "",
        }));

      const finalResponse: OpenAI.ChatCompletion = await getOpenAI().chat.completions.create({
        model: "openrouter/owl-alpha",
        messages: [
          { role: "system", content: AGENT_SYSTEM_PROMPT },
          ...historyMessages,
          { role: "user", content: args.message },
          ...toolMessages,
          ...toolResults,
        ],
      });

      const finalContent: string =
        finalResponse.choices[0].message.content ?? "Done.";

      await ctx.runMutation(api.agent_helpers._storeMessage, {
        conversationId,
        role: "assistant",
        content: finalContent,
        actionTaken: results.join("; "),
      });

      return {
        role: "assistant",
        content: finalContent,
        actionTaken: results.join("; "),
      };
    }

    // No tool call, just text response
    const content: string = message.content ?? "I don't know what to say.";
    await ctx.runMutation(api.agent_helpers._storeMessage, {
      conversationId,
      role: "assistant",
      content,
    });

    return { role: "assistant", content };
  },
});

async function executeToolCall(
  ctx: { runMutation: Function; runQuery: Function },
  projectId: string,
  name: string,
  toolArgs: Record<string, unknown>
): Promise<string> {
  switch (name) {
    case "create_note": {
      await ctx.runMutation(api.notes.create, {
        projectId,
        content: toolArgs.content as string,
        color: (toolArgs.color as string) ?? "#fbbf24",
      });
      return `Created note: "${(toolArgs.content as string).substring(0, 50)}"`;
    }
    case "update_note": {
      await ctx.runMutation(api.notes.update, {
        noteId: toolArgs.noteId as string,
        content: toolArgs.content as string | undefined,
        color: toolArgs.color as string | undefined,
      });
      return `Updated note ${toolArgs.noteId}`;
    }
    case "delete_note": {
      await ctx.runMutation(api.notes.remove, {
        noteId: toolArgs.noteId as string,
      });
      return `Deleted note ${toolArgs.noteId}`;
    }
    case "create_reminder": {
      await ctx.runMutation(api.reminders.create, {
        projectId,
        title: toolArgs.title as string,
        description: toolArgs.description as string | undefined,
        dueDate: toolArgs.dueDate as number | undefined,
        priority: (toolArgs.priority as "low" | "medium" | "high") ?? "medium",
        remindBeforeMinutes: (toolArgs.remindBeforeMinutes as number) ?? 5,
      });
      return `Created reminder: "${toolArgs.title}"`;
    }
    case "update_reminder": {
      await ctx.runMutation(api.reminders.update, {
        reminderId: toolArgs.reminderId as string,
        title: toolArgs.title as string | undefined,
        description: toolArgs.description as string | undefined,
        dueDate: toolArgs.dueDate as number | undefined,
        priority: toolArgs.priority as "low" | "medium" | "high" | undefined,
        remindBeforeMinutes: toolArgs.remindBeforeMinutes as number | undefined,
      });
      return `Updated reminder ${toolArgs.reminderId}`;
    }
    case "toggle_reminder": {
      await ctx.runMutation(api.reminders.toggle, {
        reminderId: toolArgs.reminderId as string,
      });
      return `Toggled reminder ${toolArgs.reminderId}`;
    }
    case "delete_reminder": {
      await ctx.runMutation(api.reminders.remove, {
        reminderId: toolArgs.reminderId as string,
      });
      return `Deleted reminder ${toolArgs.reminderId}`;
    }
    case "list_notes": {
      const notes = await ctx.runQuery(api.notes.list, { projectId });
      return JSON.stringify(
        (notes as Array<{ _id: string; content: string; color: string }>).map(
          (n) => ({
            id: n._id,
            content: n.content.substring(0, 100),
            color: n.color,
          })
        )
      );
    }
    case "list_reminders": {
      const reminders = await ctx.runQuery(api.reminders.list, {
        projectId,
        completed: toolArgs.completed as boolean | undefined,
      });
      return JSON.stringify(
        (
          reminders as Array<{
            _id: string;
            title: string;
            completed: boolean;
            priority: string;
            dueDate?: number;
          }>
        ).map((r) => ({
          id: r._id,
          title: r.title,
          completed: r.completed,
          priority: r.priority,
          dueDate: r.dueDate,
        }))
      );
    }
    default:
      return `Unknown tool: ${name}`;
  }
}
