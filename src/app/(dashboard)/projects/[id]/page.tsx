"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "#/server/convex/_generated/api";
import { Id } from "#/server/convex/_generated/dataModel";
import { useParams } from "next/navigation";
import { useState } from "react";
import { NotesGrid } from "#/components/notes/notes-grid";
import { ReminderList } from "#/components/reminders/reminder-list";
import { Button } from "#/components/ui/button";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "#/components/ui/resizable";
import { Plus, ExternalLink, Lock, Globe } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.id as Id<"projects">;
  const { isSignedIn, isLoaded } = useAuth();
  const project = useQuery(api.projects.get, isLoaded && isSignedIn ? { projectId } : "skip");
  const createNote = useMutation(api.notes.create);
  const [isCreating, setIsCreating] = useState(false);

  if (project === undefined) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-4 w-96 bg-muted rounded" />
        <div className="h-[600px] bg-muted rounded" />
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Project not found.</p>
      </div>
    );
  }

  const handleCreateNote = async () => {
    setIsCreating(true);
    try {
      await createNote({
        projectId,
        content: "",
        color: "#fbbf24",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {project.isPrivate ? (
              <Lock className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground" />
            )}
            <h1 className="text-2xl font-semibold tracking-tight">
              {project.repoName}
            </h1>
          </div>
          {project.description && (
            <p className="text-muted-foreground text-sm max-w-xl">
              {project.description}
            </p>
          )}
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mt-1"
          >
            <ExternalLink className="h-3 w-3" />
            {project.repoOwner}/{project.repoName}
          </a>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNote}
            disabled={isCreating}
          >
            <Plus className="h-4 w-4 mr-1" />
            Note
          </Button>
        </div>
      </div>

      {/* Notes + Reminders Split */}
      <div className="hidden md:block">
        <ResizablePanelGroup orientation="horizontal" className="min-h-[600px] rounded-lg border">
          <ResizablePanel defaultSize={60} minSize={30}>
            <div className="p-4 h-full overflow-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Notes
                </h2>
              </div>
              <NotesGrid projectId={projectId} />
            </div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={40} minSize={25}>
            <div className="p-4 h-full overflow-auto">
              <ReminderList projectId={projectId} />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Mobile: stacked layout */}
      <div className="md:hidden space-y-6">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
            Notes
          </h2>
          <NotesGrid projectId={projectId} />
        </div>
        <div>
          <ReminderList projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
