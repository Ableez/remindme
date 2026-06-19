"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "#/server/convex/_generated/api";
import { Id } from "#/server/convex/_generated/dataModel";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "#/components/ui/button";
import { ArrowLeft, Trash2, Palette, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";

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

export default function NotePage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as Id<"notes">;
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

  if (note === undefined) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (note === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Note not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-2">
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
              router.back();
            }}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
      </div>

      <div
        className="rounded-xl p-6 min-h-[400px]"
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
          className="w-full h-full min-h-[380px] bg-transparent resize-none outline-none text-base leading-relaxed placeholder:text-muted-foreground/50"
        />
      </div>
    </div>
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
        <Button variant="ghost" size="sm">
          <div
            className="w-4 h-4 rounded-full border border-black/10 mr-1.5"
            style={{ backgroundColor: color }}
          />
          <Palette className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="end">
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
