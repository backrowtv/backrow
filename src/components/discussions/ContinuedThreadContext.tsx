import Link from "next/link";
import { ArrowLeft, ChatCircle } from "@phosphor-icons/react/dist/ssr";

interface ContinuedThreadContextProps {
  threadTitle: string;
  threadSlug: string;
  clubSlug: string;
  parentCommentAuthor?: string;
  parentCommentSnippet?: string;
}

export function ContinuedThreadContext({
  threadTitle,
  threadSlug,
  clubSlug,
  parentCommentAuthor,
  parentCommentSnippet,
}: ContinuedThreadContextProps) {
  return (
    <div className="mb-4 p-3 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
        <ChatCircle className="w-3.5 h-3.5" />
        <span>Viewing a sub-thread</span>
      </div>
      <Link
        href={`/club/${clubSlug}/discuss/${threadSlug}`}
        className="text-sm text-[var(--club-accent,var(--primary))] hover:underline inline-flex items-center gap-1"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        View full discussion: {threadTitle}
      </Link>
      {parentCommentAuthor && parentCommentSnippet && (
        <p className="mt-2 text-xs text-[var(--text-secondary)] line-clamp-2">
          In reply to {parentCommentAuthor}: &quot;{parentCommentSnippet}&quot;
        </p>
      )}
    </div>
  );
}
