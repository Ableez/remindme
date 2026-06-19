"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "#/server/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "#/components/ui/command";
import {
  FolderKanban,
  StickyNote,
  Bell,
  Settings,
  Plus,
} from "lucide-react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const projects = useQuery(
    api.projects.list,
    isSignedIn ? {} : "skip"
  );

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search projects, notes, reminders..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Projects">
          {projects?.map((project) => (
            <CommandItem
              key={project._id}
              onSelect={() => {
                router.push(`/projects/${project._id}`);
                setOpen(false);
              }}
            >
              <FolderKanban className="mr-2 h-4 w-4" />
              {project.repoName}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => {
              router.push("/settings");
              setOpen(false);
            }}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
