"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Typography from "@tiptap/extension-typography";
import { sanitizeHtml } from "@/lib/security/sanitize";
import {
  TextB,
  TextItalic,
  TextStrikethrough,
  ListBullets,
  ListNumbers,
  TextHOne,
  TextHTwo,
  TextHThree,
  Link as LinkIcon,
  Image as ImageIcon,
  ArrowCounterClockwise,
  ArrowClockwise,
  Quotes,
  Minus,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { useCallback, useState } from "react";

// Helper to clean up trailing empty paragraphs from HTML
function cleanupHtml(html: string): string {
  // Remove trailing empty paragraphs
  let cleaned = html.replace(/(<p><\/p>)+$/g, "");
  // Remove multiple consecutive empty paragraphs (keep max 1)
  cleaned = cleaned.replace(/(<p><\/p>){2,}/g, "<p></p>");
  return cleaned || "<p></p>";
}

interface TipTapEditorProps {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  onImageUpload?: (file: File) => Promise<string | null>;
}

interface MenuBarProps {
  editor: Editor | null;
  onImageUpload?: (file: File) => Promise<string | null>;
}

function MenuBar({ editor, onImageUpload }: MenuBarProps) {
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  // All hooks must be called before any conditional returns
  const addImage = useCallback(() => {
    if (!editor) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && onImageUpload) {
        const url = await onImageUpload(file);
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    };
    input.click();
  }, [editor, onImageUpload]);

  const setLink = useCallback(() => {
    if (!editor) return;
    if (linkUrl) {
      // Add https:// if not present
      const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setIsAddingLink(false);
    setLinkUrl("");
  }, [editor, linkUrl]);

  const handleLinkKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (!editor) return;
        if (linkUrl) {
          const url = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        } else {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
        }
        setIsAddingLink(false);
        setLinkUrl("");
      } else if (e.key === "Escape") {
        setIsAddingLink(false);
        setLinkUrl("");
      }
    },
    [editor, linkUrl]
  );

  // Now we can safely do early return
  if (!editor) {
    return null;
  }

  const ToolbarButton = ({
    onClick,
    isActive = false,
    disabled = false,
    children,
    title,
  }: {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded transition-colors",
        isActive
          ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {children}
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-[var(--border)] mx-1" />;

  return (
    <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-[var(--border)] bg-[var(--surface-1)]">
      {/* Text formatting */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <TextB className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <TextItalic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Strikethrough"
      >
        <TextStrikethrough className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <TextHOne className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <TextHTwo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <TextHThree className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <ListBullets className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Numbered List"
      >
        <ListNumbers className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Quote"
      >
        <Quotes className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus className="h-4 w-4" />
      </ToolbarButton>

      <Divider />

      {/* Link */}
      {isAddingLink ? (
        <div className="flex items-center gap-1">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={handleLinkKeyDown}
            placeholder="Enter URL..."
            className="px-2 py-1 text-xs rounded border border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
          />
          <button
            type="button"
            onClick={setLink}
            className="px-2 py-1 text-xs rounded bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAddingLink(false);
              setLinkUrl("");
            }}
            className="px-2 py-1 text-xs rounded text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <ToolbarButton
          onClick={() => {
            const previousUrl = editor.getAttributes("link").href;
            setLinkUrl(previousUrl || "");
            setIsAddingLink(true);
          }}
          isActive={editor.isActive("link")}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
      )}

      {/* Image */}
      {onImageUpload && (
        <ToolbarButton onClick={addImage} title="Add Image">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
      )}

      <Divider />

      {/* Undo/Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
      >
        <ArrowCounterClockwise className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
      >
        <ArrowClockwise className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

export function TipTapEditor({
  content = "",
  onChange,
  placeholder = "Start writing...",
  className,
  editable = true,
  onImageUpload,
}: TipTapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        // Enable markdown-style input rules
        bold: {
          HTMLAttributes: {
            class: "font-bold",
          },
        },
        italic: {
          HTMLAttributes: {
            class: "italic",
          },
        },
        strike: {
          HTMLAttributes: {
            class: "line-through",
          },
        },
        code: {
          HTMLAttributes: {
            class: "bg-[var(--surface-2)] px-1.5 py-0.5 rounded text-sm font-mono",
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: "bg-[var(--surface-2)] p-4 rounded-lg text-sm font-mono overflow-x-auto",
          },
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto rounded-lg",
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-[var(--primary)] underline hover:text-[var(--primary)]/80",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      // Typography extension for smart quotes and other typographic improvements
      Typography,
    ],
    content,
    editable,
    immediatelyRender: false, // Prevent SSR hydration issues
    onUpdate: ({ editor }) => {
      // Clean up trailing empty paragraphs before sending to parent
      const html = cleanupHtml(editor.getHTML());
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-invert max-w-none focus:outline-none",
          "min-h-[200px] p-4",
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-[var(--text-primary)]",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-3 [&_h2]:text-[var(--text-primary)]",
          "[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mb-2 [&_h3]:text-[var(--text-primary)]",
          "[&_p]:mb-3 [&_p]:text-[var(--text-secondary)]",
          "[&_p:empty]:hidden", // Hide empty paragraphs
          "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-3",
          "[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-3",
          "[&_li]:mb-1 [&_li]:text-[var(--text-secondary)]",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-[var(--primary)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[var(--text-muted)]",
          "[&_hr]:border-[var(--border)] [&_hr]:my-4",
          "[&_a]:text-[var(--primary)] [&_a]:underline",
          "[&_img]:rounded-lg [&_img]:my-4",
          "[&_code]:bg-[var(--surface-2)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono",
          "[&_pre]:bg-[var(--surface-2)] [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto"
        ),
      },
      // Handle keyboard shortcuts
      handleKeyDown: (view, event) => {
        // Prevent excessive empty paragraphs - if current paragraph is empty and pressing Enter
        if (event.key === "Enter" && !event.shiftKey) {
          const { state } = view;
          const { selection } = state;
          const { $from } = selection;
          const parent = $from.parent;

          // Check if we're in an empty paragraph and previous sibling is also empty
          if (parent.type.name === "paragraph" && parent.textContent === "") {
            const pos = $from.before();
            if (pos > 0) {
              const nodeBefore = state.doc.resolve(pos - 1).parent;
              if (nodeBefore.type.name === "paragraph" && nodeBefore.textContent === "") {
                // Don't allow more than one consecutive empty paragraph
                event.preventDefault();
                return true;
              }
            }
          }
        }
        return false;
      },
    },
  });

  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border)] bg-[var(--surface-1)] overflow-hidden",
        className
      )}
    >
      {editable && <MenuBar editor={editor} onImageUpload={onImageUpload} />}
      <EditorContent editor={editor} />
    </div>
  );
}

// Export a preview-only component
export function TipTapPreview({ content, className }: { content: string; className?: string }) {
  // Sanitize and clean up the content before displaying (XSS protection)
  const cleanedContent = sanitizeHtml(cleanupHtml(content));

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: true,
      }),
      Typography,
    ],
    content: cleanedContent,
    editable: false,
    immediatelyRender: false, // Prevent SSR hydration issues
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-invert max-w-none",
          "px-4 py-2", // Reduced padding
          "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h1]:text-[var(--text-primary)]",
          "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h2]:text-[var(--text-primary)]",
          "[&_h3]:text-lg [&_h3]:font-medium [&_h3]:mb-1 [&_h3]:text-[var(--text-primary)]",
          "[&_p]:mb-2 [&_p]:text-[var(--text-secondary)] [&_p:last-child]:mb-0",
          "[&_p:empty]:hidden", // Hide empty paragraphs
          "[&_ul]:list-disc [&_ul]:ml-6 [&_ul]:mb-2",
          "[&_ol]:list-decimal [&_ol]:ml-6 [&_ol]:mb-2",
          "[&_li]:mb-1 [&_li]:text-[var(--text-secondary)]",
          "[&_blockquote]:border-l-4 [&_blockquote]:border-[var(--primary)] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-[var(--text-muted)]",
          "[&_hr]:border-[var(--border)] [&_hr]:my-3",
          "[&_a]:text-[var(--primary)] [&_a]:underline",
          "[&_img]:rounded-lg [&_img]:my-3",
          "[&_code]:bg-[var(--surface-2)] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono",
          "[&_pre]:bg-[var(--surface-2)] [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto",
          className
        ),
      },
    },
  });

  return <EditorContent editor={editor} />;
}
