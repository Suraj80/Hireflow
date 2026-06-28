import { useEffect } from "react";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bold,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Redo2,
  Undo2,
} from "lucide-react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function RichTextEditor({ value, onChange, disabled = false }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
    ],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[260px] px-4 py-4 focus:outline-none prose-headings:font-semibold prose-p:my-0 prose-p:text-foreground prose-li:my-0 prose-li:text-foreground prose-ul:my-0 prose-ol:my-0",
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && editor.getHTML() !== value) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-background">
      <div className="flex flex-wrap gap-2 border-b border-border bg-muted/30 p-3">
        {[
          { icon: Heading1, action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), active: editor?.isActive("heading", { level: 1 }) },
          { icon: Heading2, action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), active: editor?.isActive("heading", { level: 2 }) },
          { icon: Bold, action: () => editor?.chain().focus().toggleBold().run(), active: editor?.isActive("bold") },
          { icon: List, action: () => editor?.chain().focus().toggleBulletList().run(), active: editor?.isActive("bulletList") },
          { icon: ListOrdered, action: () => editor?.chain().focus().toggleOrderedList().run(), active: editor?.isActive("orderedList") },
        ].map((item, index) => (
          <Button
            key={index}
            type="button"
            variant={item.active ? "default" : "outline"}
            size="icon"
            disabled={!editor || disabled}
            onClick={item.action}
            className="h-9 w-9 rounded-xl"
          >
            <item.icon className="h-4 w-4" />
          </Button>
        ))}
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" size="icon" disabled={!editor || disabled} onClick={() => editor?.chain().focus().undo().run()}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" disabled={!editor || disabled} onClick={() => editor?.chain().focus().redo().run()}>
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
