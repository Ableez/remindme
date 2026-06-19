"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "#/server/convex/_generated/api";
import { Id } from "#/server/convex/_generated/dataModel";
import { useState, useEffect, useCallback, useRef } from "react";
import { useIsMobile } from "#/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { Button } from "#/components/ui/button";
import { Maximize2, Trash2, Palette, Check, Pin, PinOff, GripVertical } from "lucide-react";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { motion, AnimatePresence } from "framer-motion";
import Markdown from "react-markdown";

const NOTE_COLORS = [
  { name: "Yellow", hex: "#fbbf24" },
  { name: "Pink", hex: "#f472b6" },
  { name: "Purple", hex: "#a78bfa" },
  { name: "Green", hex: "#34d399" },
  { name: "Blue", hex: "#60a5fa" },
  { name: "Orange", hex: "#fb923c" },
  { name: "Red", hex: "#f87171" },
  { name: "Teal", hex: "#2dd4bf" },
  { name: "Violet", hex: "#c084fc" },
  { name: "Gold", hex: "#facc15" },
];

type ViewMode = "3col" | "2col" | "1col" | "list";

function getViewModeClass(mode: ViewMode): string {
  switch (mode) {
    case "3col":
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    case "2col":
      return "grid-cols-1 sm:grid-cols-2";
    case "1col":
      return "grid-cols-1";
    case "list":
      return "grid-cols-1";
  }
}

interface NoteDoc {
  _id: Id<"notes">;
  _creationTime: number;
  content: string;
  color: string;
  pinned?: boolean;
  order?: number;
}

export function NotesGrid({ projectId }: { projectId: Id<"projects"> }) {
  const notes = useQuery(api.notes.list, { projectId });
  const updateNote = useMutation(api.notes.update);
  const removeNote = useMutation(api.notes.remove);
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<ViewMode>("3col");
  const [selectedNote, setSelectedNote] = useState<Id<"notes"> | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("notes-view-mode") as ViewMode;
    if (saved) setViewMode(saved);
  }, []);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem("notes-view-mode", mode);
  };

  if (notes === undefined) {
    return (
      <div className={getViewModeClass(viewMode === "list" ? "3col" : viewMode) + " grid gap-3"}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No notes yet. Click &quot;+ Note&quot; to create one.
      </div>
    );
  }

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return (a.order ?? 0) - (b.order ?? 0);
  });

  const effectiveMode = isMobile ? "list" : viewMode;
  const isListMode = effectiveMode === "list";

  return (
    <div className="space-y-4">
      {!isMobile && (
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
          {(["3col", "2col", "1col", "list"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => handleViewModeChange(mode)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                viewMode === mode
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "3col" ? "3" : mode === "2col" ? "2" : mode === "1col" ? "1" : "\u2630"}
            </button>
          ))}
        </div>
      )}

      <div
        className={
          isListMode
            ? "space-y-2"
            : `grid ${getViewModeClass(effectiveMode)} gap-3`
        }
      >
        <AnimatePresence mode="popLayout">
          {sortedNotes.map((note) =>
            isListMode ? (
              <motion.div
                key={note._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <NoteListItem
                  note={note}
                  onClick={() => setSelectedNote(note._id)}
                />
              </motion.div>
            ) : (
              <motion.div
                key={note._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <NoteCard
                  note={note}
                  onUpdate={updateNote}
                  onDelete={removeNote}
                />
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      <Dialog
        open={selectedNote !== null}
        onOpenChange={(open) => !open && setSelectedNote(null)}
      >
        <DialogContent className="max-w-lg">
          {selectedNote && (
            <NoteDrawerContent
              noteId={selectedNote}
              onClose={() => setSelectedNote(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NoteCard({
  note,
  onUpdate,
  onDelete,
}: {
  note: NoteDoc;
  onUpdate: (args: { noteId: Id<"notes">; content?: string; color?: string; pinned?: boolean }) => void;
  onDelete: (args: { noteId: Id<"notes"> }) => void;
}) {
  const [content, setContent] = useState(note.content);
  const [dirty, setDirty] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback(() => {
    if (dirty) {
      onUpdate({ noteId: note._id, content });
      setDirty(false);
    }
  }, [dirty, content, note._id, onUpdate]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setDirty(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(save, 1000);
  };

  return (
    <motion.div
      className="rounded-lg p-4 min-h-[160px] flex flex-col shadow-sm hover:shadow-md transition-shadow cursor-default group"
      style={{ backgroundColor: note.color + "33" }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
    >
      {note.pinned && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-2">
          <Pin className="h-3 w-3" />
          Pinned
        </div>
      )}
      <textarea
        value={content}
        onChange={handleChange}
        onBlur={save}
        placeholder="Write something..."
        className="flex-1 bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground/50"
      />
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          <ColorPicker
            color={note.color}
            onChange={(color) => onUpdate({ noteId: note._id, color })}
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={() => onUpdate({ noteId: note._id, pinned: !note.pinned })}
          >
            {note.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete({ noteId: note._id })}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

function NoteListItem({
  note,
  onClick,
}: {
  note: NoteDoc;
  onClick: () => void;
}) {
  return (
    <div
      className="rounded-lg p-3 flex items-start gap-3 cursor-pointer hover:ring-1 hover:ring-border transition-all"
      style={{ backgroundColor: note.color + "22" }}
      onClick={onClick}
    >
      <div
        className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
        style={{ backgroundColor: note.color }}
      />
      <div className="flex-1 min-w-0">
        {note.pinned && (
          <Pin className="h-3 w-3 text-muted-foreground inline mr-1" />
        )}
        <p className="text-sm line-clamp-2">
          {note.content || "Empty note"}
        </p>
      </div>
    </div>
  );
}

function NoteDrawerContent({
  noteId,
  onClose,
}: {
  noteId: Id<"notes">;
  onClose: () => void;
}) {
  const note = useQuery(api.notes.get, { noteId });
  const updateNote = useMutation(api.notes.update);
  const removeNote = useMutation(api.notes.remove);
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (note) setContent(note.content);
  }, [note]);

  const save = useCallback(() => {
    if (dirty && note) {
      updateNote({ noteId, content });
      setDirty(false);
    }
  }, [dirty, content, noteId, updateNote, note]);

  if (!note) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogTitle className="text-base">Note</DialogTitle>
          <Link href={`/note/${noteId}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Maximize2 className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </DialogHeader>
      <div className="mt-4">
        <div
          className="rounded-lg p-4 min-h-[200px]"
          style={{ backgroundColor: note.color + "33" }}
        >
          <textarea
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              setDirty(true);
              clearTimeout(timerRef.current);
              timerRef.current = setTimeout(save, 1000);
            }}
            onBlur={save}
            placeholder="Write something..."
            className="w-full h-full min-h-[180px] bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground/50"
          />
        </div>
        <div className="flex items-center justify-between mt-3">
          <ColorPicker
            color={note.color}
            onChange={(color) => updateNote({ noteId, color })}
          />
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              removeNote({ noteId });
              onClose();
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>
    </>
  );
}

function ColorPicker({
  color,
  onChange,
}: {
  color: string;
  onChange: (color: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <div
            className="w-4 h-4 rounded-full border border-black/10"
            style={{ backgroundColor: color }}
          />
          <Palette className="h-3 w-3" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="grid grid-cols-5 gap-1.5">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => onChange(c.hex)}
              className="relative w-7 h-7 rounded-full transition-transform hover:scale-110 flex items-center justify-center"
              style={{ backgroundColor: c.hex }}
              title={c.name}
            >
              {color === c.hex && (
                <Check className="h-3.5 w-3.5 text-white drop-shadow" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
