"use client";

import { useState, useEffect } from "react";
import { useAction, useMutation } from "convex/react";
import { api } from "#/server/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "#/components/ui/dialog";
import { Button } from "#/components/ui/button";
import { Lock, Globe, Star, Loader2 } from "lucide-react";

interface GitHubRepo {
  repoId: number;
  repoName: string;
  repoOwner: string;
  repoUrl: string;
  description: string | null;
  isPrivate: boolean;
  updatedAt: string;
  language: string | null;
  stars: number;
}

export function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const fetchRepos = useAction(api.github.fetchRepos);
  const createProject = useMutation(api.projects.create);
  const ensureSettings = useMutation(api.settings.ensureSettings);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/github-token");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to get GitHub token");
          setLoading(false);
          return;
        }
        const repos = await fetchRepos({ githubToken: data.token });
        setRepos(repos);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to fetch repos");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, fetchRepos]);

  const handleCreate = async (repo: GitHubRepo) => {
    setCreating(repo.repoId);
    try {
      await createProject({
        repoId: repo.repoId,
        repoName: repo.repoName,
        repoOwner: repo.repoOwner,
        repoUrl: repo.repoUrl,
        description: repo.description ?? undefined,
        isPrivate: repo.isPrivate,
      });
      // Ensure user settings exist
      await ensureSettings({});
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create project");
    } finally {
      setCreating(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Pick a GitHub repo to create a project around.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 text-destructive text-sm rounded-md p-3 mb-4">
              {error}
            </div>
          )}

          {!loading && !error && repos.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No repos found.
            </div>
          )}

          {!loading && repos.length > 0 && (
            <div className="space-y-2">
              {repos.map((repo) => (
                <div
                  key={repo.repoId}
                  className="flex items-center justify-between rounded-lg border p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2 mb-1">
                      {repo.isPrivate ? (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="font-medium truncate">
                        {repo.repoOwner}/{repo.repoName}
                      </span>
                      {repo.language && (
                        <span className="text-xs bg-secondary px-1.5 py-0.5 rounded">
                          {repo.language}
                        </span>
                      )}
                    </div>
                    {repo.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {repo.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {repo.stars > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {repo.stars}
                        </span>
                      )}
                      <span>
                        Updated {new Date(repo.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleCreate(repo)}
                    disabled={creating !== null}
                  >
                    {creating === repo.repoId ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Add"
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
