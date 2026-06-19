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
  CheckCheck,
  Trash,
  Repeat,
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
import { motion, AnimatePresence } from "framer-motion";

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
  order?: number;
  recurring?: "daily" | "weekly" | "monthly";
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
    medium: { label: "Med", className: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400" },
    high: { label: "High", className: "bg-red-500/20 text-red-600 dark:text-red-400" },
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
  const completeAll = useMutation(api.reminders.completeAll);
  const deleteCompleted = useMutation(api.reminders.deleteCompleted);
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
  const hasCompleted = groups.completed.length > 0;
  const hasPending = reminders.some((r) => !r.completed);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Reminders
        </h2>
        <div className="flex items-center gap-1">
          {hasPending && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => completeAll({ projectId })}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              All
            </Button>
          )}
          {hasCompleted && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-destructive hover:text-destructive"
              onClick={() => deleteCompleted({ projectId })}
            >
              <Trash className="h-3.5 w-3.5 mr-1" />
              Done
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => setShowCreate(!showCreate)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
          >
            <CreateReminderForm
              projectId={projectId}
              onCreated={() => setShowCreate(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

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
            count={items.length}
            isOverdue={key === "overdue"}
          >
            <AnimatePresence mode="popLayout">
              {items.map((reminder) => (
                <motion.div
                  key={reminder._id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.15 }}
                >
                  <ReminderItem
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
                </motion.div>
              ))}
            </AnimatePresence>
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
  count,
  isOverdue,
  children,
}: {
  label: string;
  defaultOpen: boolean;
  count: number;
  isOverdue?: boolean;
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
        <span className={isOverdue ? "text-red-500" : ""}>{label}</span>
        <span className="text-[10px] opacity-50">({count})</span>
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
    recurring?: "daily" | "weekly" | "monthly";
  }) => void;
}) {
  const isOverdue = !reminder.completed && reminder.dueDate && reminder.dueDate < Date.now();

  return (
    <div
      className={`rounded-lg border bg-card transition-all ${
        isOverdue ? "border-red-300 dark:border-red-800 animate-pulse" : ""
      }`}
    >
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
            className={`text-sm transition-all ${
              reminder.completed
                ? "line-through text-muted-foreground"
                : ""
            }`}
          >
            {reminder.title}
          </span>
          {reminder.recurring && (
            <Repeat className="h-3 w-3 text-muted-foreground inline ml-1.5" />
          )}
        </div>
        <PriorityBadge priority={reminder.priority} />
        {reminder.dueDate && !reminder.completed && (
          <span
            className={`text-[10px] flex items-center gap-1 ${
              isOverdue ? "text-red-500 font-medium" : "text-muted-foreground"
            }`}
          >
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

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="px-3 pb-3 pt-1 border-t space-y-2"
          >
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
              <Select
                defaultValue={reminder.recurring ?? "none"}
                onValueChange={(v) =>
                  onUpdate({
                    recurring: v === "none" ? undefined : (v as "daily" | "weekly" | "monthly"),
                  })
                }
              >
                <SelectTrigger className="h-7 text-xs w-28">
                  <SelectValue placeholder="Repeat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No repeat</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
