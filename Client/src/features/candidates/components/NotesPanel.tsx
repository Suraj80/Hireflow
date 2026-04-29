import { useMemo, useState } from "react";
import { Pin, PinOff, Save, SquarePen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/features/jobs/components/RichTextEditor";
import { formatRelative, formatTimestamp } from "@/features/candidates/helpers";
import { CandidateNote, UserSummary } from "@/features/candidates/types";

type NotesPanelProps = {
  candidateId: string;
  notes: CandidateNote[];
  canManage: boolean;
  mentionableUsers?: UserSummary[];
  onAdd: (payload: { content: string; pinned?: boolean; mentions?: string[] }) => Promise<void>;
  onUpdate: (noteId: string, payload: { content: string; pinned?: boolean; mentions?: string[] }) => Promise<void>;
  onDelete: (noteId: string) => Promise<void>;
};

const inferMentions = (content: string) =>
  Array.from(new Set((content.replace(/<[^>]+>/g, " ").match(/@([a-z0-9._-]+)/gi) || []).map((item) => item.slice(1))));

export function NotesPanel({
  candidateId,
  notes,
  canManage,
  mentionableUsers = [],
  onAdd,
  onUpdate,
  onDelete,
}: NotesPanelProps) {
  const [draftContent, setDraftContent] = useState("");
  const [draftPinned, setDraftPinned] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingPinned, setEditingPinned] = useState(false);

  const mentionExamples = useMemo(
    () => mentionableUsers.slice(0, 4).map((user) => `@${user.name.toLowerCase().replace(/\s+/g, ".")}`),
    [mentionableUsers]
  );

  const handleAddNote = async () => {
    if (!draftContent.replace(/<[^>]+>/g, "").trim()) {
      toast.error("Note content is required");
      return;
    }

    try {
      setSaving(true);
      await onAdd({
        content: draftContent,
        pinned: draftPinned,
        mentions: inferMentions(draftContent),
      });
      setDraftContent("");
      setDraftPinned(false);
      toast.success("Note added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save note");
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (note: CandidateNote) => {
    setEditingId(note.id);
    setEditingContent(note.content);
    setEditingPinned(note.pinned);
  };

  const handleUpdate = async (noteId: string) => {
    if (!editingContent.replace(/<[^>]+>/g, "").trim()) {
      toast.error("Note content is required");
      return;
    }

    try {
      setSaving(true);
      await onUpdate(noteId, {
        content: editingContent,
        pinned: editingPinned,
        mentions: inferMentions(editingContent),
      });
      setEditingId(null);
      setEditingContent("");
      setEditingPinned(false);
      toast.success("Note updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update note");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!window.confirm("Delete this note?")) {
      return;
    }

    try {
      await onDelete(noteId);
      toast.success("Note deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete note");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Add internal note</CardTitle>
          <p className="text-sm text-muted-foreground">
            Notes stay private to the hiring team. Mention teammates inline
            {mentionExamples.length ? `, for example ${mentionExamples.join(", ")}` : ""}.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <RichTextEditor value={draftContent} onChange={setDraftContent} disabled={!canManage || saving} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Switch
                id={`candidate-note-pin-${candidateId}`}
                checked={draftPinned}
                onCheckedChange={setDraftPinned}
                disabled={!canManage || saving}
              />
              <Label htmlFor={`candidate-note-pin-${candidateId}`}>Pin this note</Label>
            </div>
            <Button
              type="button"
              className="h-11 rounded-2xl"
              disabled={!canManage || saving}
              onClick={() => void handleAddNote()}
            >
              <Save className="mr-2 h-4 w-4" />
              Save note
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Note history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notes.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
              <p className="font-medium">No notes yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Internal recruiter notes will collect here as soon as the first update is added.
              </p>
            </div>
          ) : (
            notes.map((note) => {
              const isEditing = editingId === note.id;

              return (
                <div key={note.id} className="rounded-[24px] border border-border/80 bg-background p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{note.author?.name || "Unknown recruiter"}</p>
                        {note.pinned && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700">
                            <Pin className="mr-1 h-3.5 w-3.5" />
                            Pinned
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatRelative(note.createdAt)} | {formatTimestamp(note.createdAt)}
                        {note.editedAt ? ` | edited ${formatRelative(note.editedAt)}` : ""}
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" className="h-9 rounded-2xl" onClick={() => startEditing(note)}>
                          <SquarePen className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button type="button" variant="ghost" className="h-9 rounded-2xl text-destructive" onClick={() => void handleDelete(note.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="mt-4 space-y-4">
                      <RichTextEditor value={editingContent} onChange={setEditingContent} disabled={saving} />
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <Switch checked={editingPinned} onCheckedChange={setEditingPinned} disabled={saving} />
                          <Label>Pin note</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" className="h-10 rounded-2xl" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                          <Button type="button" className="h-10 rounded-2xl" disabled={saving} onClick={() => void handleUpdate(note.id)}>
                            <Save className="mr-2 h-4 w-4" />
                            Update note
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm mt-4 max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: note.content }} />
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
