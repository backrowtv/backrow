"use client";

import { useState, useCallback } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { TextB, TextItalic, TextUnderline, ListBullets, ListNumbers } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getContentLength, isOverLimit, getLimitPercentage } from "@/lib/text/formatting";

interface SimpleRichTextEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  showCharacterCount?: boolean;
}

// Toolbar button component - defined outside to prevent re-renders
function ToolbarButton({
  onMouseDown,
  isActive = false,
  children,
  title,
}: {
  onMouseDown: (e: React.MouseEvent) => void;
  isActive?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors",
        isActive
          ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
      )}
    >
      {children}
    </button>
  );
}

function MenuBar({ editor }: { editor: Editor | null }) {
  if (!editor) return null;

  // Use onMouseDown with preventDefault to avoid losing focus from the editor
  const handleBold = (e: React.MouseEvent) => {
    e.preventDefault();
    editor.chain().focus().toggleBold().run();
  };

  const handleItalic = (e: React.MouseEvent) => {
    e.preventDefault();
    editor.chain().focus().toggleItalic().run();
  };

  const handleUnderline = (e: React.MouseEvent) => {
    e.preventDefault();
    editor.chain().focus().toggleUnderline().run();
  };

  const handleBulletList = (e: React.MouseEvent) => {
    e.preventDefault();
    editor.chain().focus().toggleBulletList().run();
  };

  const handleOrderedList = (e: React.MouseEvent) => {
    e.preventDefault();
    editor.chain().focus().toggleOrderedList().run();
  };

  return (
    <div className="flex items-center gap-0.5 p-1.5 border-b border-[var(--border)] bg-[var(--surface-1)]">
      <ToolbarButton
        onMouseDown={handleBold}
        isActive={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <TextB className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onMouseDown={handleItalic}
        isActive={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <TextItalic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onMouseDown={handleUnderline}
        isActive={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <TextUnderline className="h-4 w-4" />
      </ToolbarButton>
      <div className="w-px h-4 bg-[var(--border)] mx-1" />
      <ToolbarButton
        onMouseDown={handleBulletList}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <ListBullets className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onMouseDown={handleOrderedList}
        isActive={editor.isActive("orderedList")}
        title="Numbered List"
      >
        <ListNumbers className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

export function SimpleRichTextEditor({
  content = "",
  onChange,
  placeholder = "Write your note...",
  className,
  maxLength,
  showCharacterCount = false,
}: SimpleRichTextEditorProps) {
  // Force re-render when selection changes to update toolbar button states
  const [, setForceUpdate] = useState(0);
  const forceRerender = useCallback(() => setForceUpdate((n) => n + 1), []);

  // Track current content for character counting
  const [currentContent, setCurrentContent] = useState(content);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setCurrentContent(html);
      onChange?.(html);
    },
    onSelectionUpdate: forceRerender,
    onTransaction: forceRerender,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-invert prose-sm max-w-none focus:outline-none",
          "min-h-[80px] p-3 text-sm",
          "[&_p]:mb-2 [&_p]:text-[var(--text-primary)] [&_p:last-child]:mb-0",
          "[&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-2",
          "[&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-2",
          "[&_li]:mb-0.5 [&_li]:text-[var(--text-primary)]",
          "[&_u]:underline",
          "[&_.is-editor-empty:first-child::before]:text-[var(--text-muted)] [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:pointer-events-none"
        ),
      },
    },
  });

  // Character count calculations
  const charCount = getContentLength(currentContent);
  const isOver = maxLength ? isOverLimit(currentContent, maxLength) : false;
  const percentage = maxLength ? getLimitPercentage(currentContent, maxLength) : 0;
  const showCounter = showCharacterCount || maxLength;

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden",
        isOver && "border-[var(--error)]",
        className
      )}
    >
      <MenuBar editor={editor} />
      <EditorContent editor={editor} />
      {showCounter && (
        <div className="flex justify-end px-3 py-1.5 border-t border-[var(--border)] bg-[var(--surface-1)]">
          <span
            className={cn(
              "text-xs",
              isOver
                ? "text-[var(--error)]"
                : percentage >= 90
                  ? "text-[var(--warning)]"
                  : "text-[var(--text-muted)]"
            )}
          >
            {maxLength
              ? `${charCount.toLocaleString()} / ${maxLength.toLocaleString()}`
              : charCount.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
}

// Preview component for displaying rich text content
export function SimpleRichTextPreview({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Underline,
    ],
    content,
    editable: false,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-invert prose-sm max-w-none break-words",
          "[&_*]:break-words",
          "[&_p]:mb-2 [&_p]:text-[var(--text-primary)] [&_p:last-child]:mb-0",
          "[&_ul]:list-disc [&_ul]:ml-4 [&_ul]:mb-2",
          "[&_ol]:list-decimal [&_ol]:ml-4 [&_ol]:mb-2",
          "[&_li]:mb-0.5 [&_li]:text-[var(--text-primary)]",
          "[&_u]:underline",
          className
        ),
      },
    },
  });

  return <EditorContent editor={editor} />;
}
