"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "#/server/convex/_generated/api";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Plus, GitBranch, Lock, Globe, StickyNote, Bell } from "lucide-react";
import { CreateProjectDialog } from "#/components/project/create-project-dialog";
import Link from "next/link";

export default function DashboardPage() {
  const projects = useQuery(api.projects.list);
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            Your journal, organized by repo.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects === undefined && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-40 rounded-lg border bg-card animate-pulse"
            />
          ))}
        </div>
      )}

      {projects && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium">No projects yet</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Connect a GitHub repo to get started.
          </p>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
        </div>
      )}

      {projects && projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project._id}
              href={`/projects/${project._id}`}
              className="block"
            >
              <div className="rounded-lg border bg-card p-5 hover:border-primary/50 transition-colors cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {project.isPrivate ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                    <h3 className="font-medium truncate">{project.repoName}</h3>
                  </div>
                  <GitBranch className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
                {project.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <StickyNote className="h-3 w-3" />
                    notes
                  </span>
                  <span className="flex items-center gap-1">
                    <Bell className="h-3 w-3" />
                    reminders
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateProjectDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}

function FolderKanban(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
      <path d="M12 10v6" />
      <path d="m9 13 3-3 3 3" />
    </svg>
  );
}
