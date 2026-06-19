"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "#/server/convex/_generated/api";
import { useState } from "react";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import {
  Plus,
  GitBranch,
  Lock,
  Globe,
  StickyNote,
  Bell,
  Search,
  X,
} from "lucide-react";
import { CreateProjectDialog } from "#/components/project/create-project-dialog";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { motion } from "framer-motion";
import { EmptyState } from "#/components/ui/empty-state";

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const projects = useQuery(
    api.projects.list,
    isLoaded && isSignedIn ? {} : "skip"
  );
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");

  const filteredProjects = projects?.filter((p) =>
    p.repoName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground text-sm">
            Your journal, organized by repo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projects && projects.length > 0 && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 w-48"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
          )}
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>
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
        <EmptyState
          icon={<GitBranch className="h-12 w-12" />}
          title="No projects yet"
          description="Connect a GitHub repo to start tracking your work."
          action={
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          }
        />
      )}

      {filteredProjects && filteredProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project, i) => (
            <motion.div
              key={project._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                href={`/projects/${project._id}`}
                className="block"
              >
                <div className="rounded-lg border bg-card p-5 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer h-full group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {project.isPrivate ? (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Globe className="h-4 w-4 text-muted-foreground" />
                      )}
                      <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                        {project.repoName}
                      </h3>
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
            </motion.div>
          ))}
        </div>
      )}

      {search && filteredProjects && filteredProjects.length === 0 && (
        <p className="text-center py-8 text-muted-foreground text-sm">
          No projects matching &quot;{search}&quot;
        </p>
      )}

      <CreateProjectDialog open={showCreate} onOpenChange={setShowCreate} />
    </div>
  );
}
