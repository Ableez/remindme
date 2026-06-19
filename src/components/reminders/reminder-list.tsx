"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "#/server/convex/_generated/api";
import { Id } from "#/server/convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import { Badge } from "#/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "#/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";

interface Reminder {
  _id: Id<"reminders">;
  _creationTime: number;
  projectId: Id<"projects">;
  userId: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: number;
  dueDate?: number;
  priority: "low" | "medium" | "high";
  remindBeforeMinutes: number;
}

function groupReminders(reminders: Reminder[]) {
  const now = Date.now();
  const groups: {
    overdue: Reminder[];
    today: Reminder[];
    upcoming: Reminder[];
    noDate: Reminder[];
    completed: Reminder[];
  } = { overdue: [], today: [], upcoming: [], noDate: [], completed: [] };

  for (const r of reminders) {
    if (r.completed) {
      groups.completed.push(r);
    } else if (!r.dueDate) {
      groups.noDate.push(r);
    } else if (r.dueDate < now) {
      groups.overdue.push(r);
    } else if (r.dueDate < now + 86400000) {
      groups.today.push(r);
    } else {
      groups.upcoming.push(r);
    }
  }

  return groups;
}

function formatRelativeDate(timestamp: number): string {
  const now = Date.now();
  const diff = timestamp - now;
  const absDiff = Math.abs(diff);
  const minutes = Math.floor(absDiff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (diff < 0) {
    if (days > 0) return `overdue by ${days}d`;
    if (hours > 0) return `overdue by ${hours}h`;
    return `overdue by ${minutes}m`;
  }

  if (days > 0) return `in ${days}d`;
  if (hours > 0) return `in ${hours}h`;
  return `in ${minutes}m`;
}

function PriorityBadge({ priority }: { priority: string }) {
  const config = {
    low: { label: "Low", className: "bg-muted text-muted-foreground" },
    medium: { label: "Med", className: "bg-yellow-500/20 text-yellow-600" },
    high: { label: "High", className: "bg-red-500/20 text-red-600" },
  };
  const c = config[priority as keyof typeof config] ?? config.medium;
  return (
    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${c.className}`}>
      {c.label}
    </Badge>
  );
}

export function ReminderList({
  projectId,
}: {
  projectId: Id<"projects">;
}) {
  const reminders = useQuery(api.reminders.list, { projectId });
  const toggleReminder = useMutation(api.reminders.toggle);
  const removeReminder = useMutation(api.reminders.remove);
  const updateReminder = useMutation(api.reminders.update);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<Id<"reminders"> | null>(null);

  if (reminders === undefined) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 bg-muted rounded animate-pulse" />
        ))}
      </div>
    );
  }

  const groups = groupReminders(reminders);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Reminders
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {showCreate && (
        <CreateReminderForm
          projectId={projectId}
          onCreated={() => setShowCreate(false)}
        />
      )}

      {Object.entries(groups).map(([key, items]) => {
        if (items.length === 0) return null;
        const labels: Record<string, string> = {
          overdue: "Overdue",
          today: "Today",
          upcoming: "Upcoming",
          noDate: "No Date",
          completed: "Completed",
        };
        return (
          <ReminderGroup
            key={key}
            label={labels[key]}
            defaultOpen={key !== "completed"}
          >
            {items.map((reminder) => (
              <ReminderItem
                key={reminder._id}
                reminder={reminder}
                expanded={expandedId === reminder._id}
                onToggle={() => toggleReminder({ reminderId: reminder._id })}
                onDelete={() => removeReminder({ reminderId: reminder._id })}
                onExpand={() =>
                  setExpandedId(expandedId === reminder._id ? null : reminder._id)
                }
                onUpdate={(args) =>
                  updateReminder({ reminderId: reminder._id, ...args })
                }
              />
            ))}
          </ReminderGroup>
        );
      })}

      {reminders.length === 0 && (
        <p className="text-center py-8 text-muted-foreground text-sm">
          No reminders. Click &quot;Add&quot; to create one.
        </p>
      )}
    </div>
  );
}

function ReminderGroup({
  label,
  defaultOpen,
  children,
}: {
  label: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground w-full">
        {open ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        {label}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-1 space-y-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function ReminderItem({
  reminder,
  expanded,
  onToggle,
  onDelete,
  onExpand,
  onUpdate,
}: {
  reminder: Reminder;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onExpand: () => void;
  onUpdate: (args: {
    title?: string;
    description?: string;
    priority?: "low" | "medium" | "high";
  }) => void;
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 p-2.5">
        <Checkbox
          checked={reminder.completed}
          onCheckedChange={onToggle}
          className="flex-shrink-0"
        />
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={onExpand}
        >
          <span
            className={`text-sm ${
              reminder.completed ? "line-through text-muted-foreground" : ""
            }`}
          >
            {reminder.title}
          </span>
        </div>
        <PriorityBadge priority={reminder.priority} />
        {reminder.dueDate && !reminder.completed && (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeDate(reminder.dueDate)}
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t space-y-2">
          <Textarea
            defaultValue={reminder.description ?? ""}
            placeholder="Description..."
            className="text-xs min-h-[60px]"
            onBlur={(e) =>
              onUpdate({ description: e.target.value })
            }
          />
          <div className="flex items-center gap-2">
            <Select
              defaultValue={reminder.priority}
              onValueChange={(v) =>
                onUpdate({ priority: v as "low" | "medium" | "high" })
              }
            >
              <SelectTrigger className="h-7 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateReminderForm({
  projectId,
  onCreated,
}: {
  projectId: Id<"projects">;
  onCreated: () => void;
}) {
  const createReminder = useMutation(api.reminders.create);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createReminder({
      projectId,
      title: title.trim(),
      priority,
    });
    setTitle("");
    onCreated();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Reminder title..."
        className="h-8 text-sm flex-1"
        autoFocus
      />
      <Select
        value={priority}
        onValueChange={(v) => setPriority(v as "low" | "medium" | "high")}
      >
        <SelectTrigger className="h-8 text-xs w-20">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="low">Low</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="high">High</SelectItem>
        </SelectContent>
      </Select>
      <Button type="submit" size="sm" className="h-8">
        Add
      </Button>
    </form>
  );
}
