import { useEffect } from "react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bold,
  Code2,
  Heading1,
  Heading2,
  Link2,
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
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-primary underline underline-offset-2",
        },
      }),
    ],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[260px] px-4 py-4 focus:outline-none prose-headings:font-semibold prose-p:text-foreground prose-li:text-foreground",
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
          { icon: Code2, action: () => editor?.chain().focus().toggleCodeBlock().run(), active: editor?.isActive("codeBlock") },
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
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!editor || disabled}
          onClick={() => {
            const url = window.prompt("Enter a URL");
            if (!url) return;
            editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
          }}
          className={cn("h-9 w-9 rounded-xl", editor?.isActive("link") && "border-primary text-primary")}
        >
          <Link2 className="h-4 w-4" />
        </Button>
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
