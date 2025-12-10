"use client";

import { useState, useTransition, useRef } from "react";
import {
  CaretRight,
  Plus,
  Link as LinkIcon,
  Trash,
  PencilSimple,
  DiscordLogo,
  FacebookLogo,
  InstagramLogo,
  TwitterLogo,
  YoutubeLogo,
  TiktokLogo,
  GlobeSimple,
  ChatCircle,
  Envelope,
  BookOpen,
  FileText,
  Video,
  TextAlignLeft,
  ListNumbers,
  X,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useClubPreference } from "@/lib/hooks/useClubPreferences";
import type { ClubResource, ResourceType } from "@/app/actions/club-resources.types";
import {
  createClubResource,
  deleteClubResource,
  updateClubResource,
} from "@/app/actions/club-resources";

// Icon mapping for resource types
const ICON_OPTIONS = [
  { value: "discord", label: "Discord", icon: DiscordLogo },
  { value: "facebook", label: "Facebook", icon: FacebookLogo },
  { value: "instagram", label: "Instagram", icon: InstagramLogo },
  { value: "twitter", label: "X", icon: TwitterLogo },
  { value: "youtube", label: "YouTube", icon: YoutubeLogo },
  { value: "tiktok", label: "TikTok", icon: TiktokLogo },
  { value: "website", label: "Website", icon: GlobeSimple },
  { value: "chat", label: "Chat/Slack", icon: ChatCircle },
  { value: "email", label: "Email", icon: Envelope },
  { value: "wiki", label: "Wiki/Docs", icon: BookOpen },
  { value: "document", label: "Document", icon: FileText },
  { value: "video", label: "Video", icon: Video },
  { value: "link", label: "Other Link", icon: LinkIcon },
  { value: "text", label: "Text", icon: TextAlignLeft },
  { value: "rules", label: "Rules", icon: ListNumbers },
] as const;

const RESOURCE_TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: "link", label: "Link" },
  { value: "text", label: "Text" },
  { value: "rules", label: "Rules" },
];

interface IconSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

function IconSelector({ value, onChange }: IconSelectorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const selectedOption = ICON_OPTIONS.find((opt) => opt.value === value);
  const SelectedIcon = selectedOption?.icon || LinkIcon;

  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all",
          "border bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-primary)]",
          "hover:border-[var(--club-accent,var(--primary))]"
        )}
      >
        <SelectedIcon className="w-4 h-4" weight="fill" />
        <span className="text-sm">{selectedOption?.label || "Select icon"}</span>
      </button>
    );
  }

  return (
    <div className="grid grid-cols-7 gap-1">
      {ICON_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange(opt.value);
              setIsExpanded(false);
            }}
            className={cn(
              "flex items-center justify-center p-2 rounded-md transition-all",
              "border",
              isSelected
                ? "bg-[var(--club-accent,var(--primary))] border-[var(--club-accent,var(--primary))] text-white"
                : "bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--club-accent,var(--primary))] hover:text-[var(--text-primary)]"
            )}
            title={opt.label}
          >
            <Icon className="w-5 h-5" weight={isSelected ? "fill" : "regular"} />
          </button>
        );
      })}
    </div>
  );
}

function getIconComponent(iconValue: string | null, resourceType?: string) {
  if (iconValue) {
    const iconOption = ICON_OPTIONS.find((opt) => opt.value === iconValue);
    if (iconOption) return iconOption.icon;
  }
  // Default icons based on resource type
  if (resourceType === "text") return TextAlignLeft;
  if (resourceType === "rules") return ListNumbers;
  return LinkIcon;
}

// Converts between newline-separated string and array for rules
function rulesToArray(content: string): string[] {
  const lines = content.split("\n").filter((l) => l.trim());
  return lines.length > 0 ? lines : [""];
}

function arrayToRules(rules: string[]): string {
  return rules.filter((r) => r.trim()).join("\n");
}

interface RulesListInputProps {
  value: string;
  onChange: (value: string) => void;
}

function RulesListInput({ value, onChange }: RulesListInputProps) {
  const [rules, setRules] = useState<string[]>(() => rulesToArray(value));

  const updateRule = (index: number, text: string) => {
    const next = [...rules];
    next[index] = text;
    setRules(next);
    onChange(arrayToRules(next));
  };

  const addRule = () => {
    const next = [...rules, ""];
    setRules(next);
  };

  const removeRule = (index: number) => {
    if (rules.length <= 1) return;
    const next = rules.filter((_, i) => i !== index);
    setRules(next);
    onChange(arrayToRules(next));
  };

  return (
    <div className="space-y-1.5">
      {rules.map((rule, i) => (
        <div key={i} className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-[var(--text-muted)] w-5 text-right flex-shrink-0">
            {i + 1}.
          </span>
          <input
            type="text"
            value={rule}
            onChange={(e) => updateRule(i, e.target.value)}
            placeholder={`Rule ${i + 1}`}
            className="flex-1 min-w-0 px-2 py-1 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            maxLength={500}
          />
          {rules.length > 1 && (
            <button
              type="button"
              onClick={() => removeRule(i)}
              className="p-0.5 text-[var(--text-muted)] hover:text-[var(--destructive)] transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addRule}
        className="flex items-center gap-1 text-xs font-medium text-[var(--club-accent,var(--primary))] hover:text-[var(--club-accent,var(--primary))]/80 transition-colors ml-7"
      >
        <Plus className="w-3 h-3" />
        Add rule
      </button>
    </div>
  );
}

interface AddResourceFormProps {
  clubId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function AddResourceForm({ clubId, onSuccess, onCancel }: AddResourceFormProps) {
  const [isPending, startTransition] = useTransition();
  const [resourceType, setResourceType] = useState<ResourceType>("link");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [icon, setIcon] = useState("link");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleTypeChange = (type: ResourceType) => {
    setResourceType(type);
    setError(null);
    // Auto-set default icon for type
    if (type === "link") setIcon("link");
    else if (type === "text") setIcon("text");
    else if (type === "rules") setIcon("rules");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (resourceType === "link" && !url.trim()) {
      setError("URL is required");
      return;
    }

    if (resourceType !== "link" && !content.trim()) {
      setError("Content is required");
      return;
    }

    startTransition(async () => {
      const result = await createClubResource({
        clubId,
        title: title.trim(),
        resourceType,
        url: resourceType === "link" ? url.trim() : undefined,
        content: resourceType !== "link" ? content.trim() : undefined,
        icon,
        description: description.trim() || undefined,
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to add resource");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 pt-2">
      {/* Resource type selector */}
      <div className="flex gap-1 p-0.5 bg-[var(--surface-2)] rounded-md">
        {RESOURCE_TYPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleTypeChange(opt.value)}
            className={cn(
              "flex-1 text-xs font-medium py-1.5 rounded transition-all",
              resourceType === opt.value
                ? "bg-[var(--club-accent,var(--primary))] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div>
        <label
          htmlFor="resource-title"
          className="block text-xs font-medium text-[var(--text-muted)] mb-1"
        >
          Title
        </label>
        <input
          id="resource-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            resourceType === "rules"
              ? "e.g., Club Rules"
              : resourceType === "text"
                ? "e.g., About This Club"
                : "e.g., Discord Server"
          }
          className="w-full px-3 py-1.5 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          maxLength={100}
        />
      </div>

      {resourceType === "link" && (
        <>
          <div>
            <label
              htmlFor="resource-url"
              className="block text-xs font-medium text-[var(--text-muted)] mb-1"
            >
              URL
            </label>
            <input
              id="resource-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-1.5 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div>
            <label
              htmlFor="resource-description"
              className="block text-xs font-medium text-[var(--text-muted)] mb-1"
            >
              Description (optional)
            </label>
            <input
              id="resource-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="w-full px-3 py-1.5 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              maxLength={200}
            />
          </div>
        </>
      )}

      {resourceType === "text" && (
        <div>
          <label
            htmlFor="resource-content"
            className="block text-xs font-medium text-[var(--text-muted)] mb-1"
          >
            Content
          </label>
          <textarea
            id="resource-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your text content..."
            rows={4}
            className="w-full px-3 py-1.5 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-y"
            maxLength={5000}
          />
        </div>
      )}

      {resourceType === "rules" && (
        <div>
          <p className="block text-xs font-medium text-[var(--text-muted)] mb-1">Rules</p>
          <RulesListInput value={content} onChange={setContent} />
        </div>
      )}

      <div>
        <p className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">Icon</p>
        <IconSelector value={icon} onChange={setIcon} />
      </div>

      <div className="relative">
        <p
          className={cn(
            "absolute left-0 bottom-full mb-0.5 text-xs text-[var(--destructive)]",
            !error && "invisible pointer-events-none"
          )}
        >
          {error}
        </p>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" size="sm" variant="club-accent" disabled={isPending}>
            {isPending ? "Adding..." : "Add Resource"}
          </Button>
        </div>
      </div>
    </form>
  );
}

interface ResourceItemProps {
  resource: ClubResource;
  canManage: boolean;
  onDeleted: () => void;
}

function ResourceItem({ resource, canManage, onDeleted }: ResourceItemProps) {
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(resource.title);
  const [editUrl, setEditUrl] = useState(resource.url || "");
  const [editIcon, setEditIcon] = useState(resource.icon || "link");
  const [editDescription, setEditDescription] = useState(resource.description || "");
  const [editContent, setEditContent] = useState(resource.content || "");

  const Icon = getIconComponent(resource.icon, resource.resource_type);
  const _isExpandable = resource.resource_type === "text" || resource.resource_type === "rules";

  const handleDelete = () => {
    if (!confirm("Delete this resource?")) return;

    startTransition(async () => {
      const result = await deleteClubResource(resource.id);
      if (result.success) {
        onDeleted();
      }
    });
  };

  const handleSaveEdit = () => {
    startTransition(async () => {
      const result = await updateClubResource({
        id: resource.id,
        title: editTitle.trim(),
        ...(resource.resource_type === "link"
          ? { url: editUrl.trim(), description: editDescription.trim() || undefined }
          : { content: editContent.trim() }),
        icon: editIcon,
      });
      if (result.success) {
        setIsEditing(false);
      }
    });
  };

  if (isEditing) {
    return (
      <div className="space-y-2 p-2 bg-[var(--surface-1)] rounded-lg">
        <input
          type="text"
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full px-2 py-1 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded text-[var(--text-primary)]"
          placeholder="Title"
        />
        {resource.resource_type === "link" ? (
          <>
            <input
              type="text"
              value={editUrl}
              onChange={(e) => setEditUrl(e.target.value)}
              className="w-full px-2 py-1 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded text-[var(--text-primary)]"
              placeholder="URL"
            />
            <input
              type="text"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              className="w-full px-2 py-1 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded text-[var(--text-primary)]"
              placeholder="Description (optional)"
            />
          </>
        ) : resource.resource_type === "rules" ? (
          <RulesListInput value={editContent} onChange={setEditContent} />
        ) : (
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={3}
            className="w-full px-2 py-1 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded text-[var(--text-primary)] resize-y"
            placeholder="Enter content..."
            maxLength={5000}
          />
        )}
        <IconSelector value={editIcon} onChange={setEditIcon} />
        <div className="flex gap-1 justify-end">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsEditing(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSaveEdit} disabled={isPending}>
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  // Link resource — clickable external link (original behavior)
  if (resource.resource_type === "link") {
    return (
      <div className="group flex items-center gap-2">
        <a
          href={resource.url!}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center gap-2 py-1.5 rounded transition-colors hover:bg-[var(--surface-1)] px-1 -mx-1"
        >
          <Icon className="w-4 h-4 flex-shrink-0 text-[var(--text-muted)]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-[var(--text-primary)] truncate group-hover:text-[var(--club-accent,var(--primary))] transition-colors">
              {resource.title}
            </p>
            {resource.description && (
              <p className="text-[10px] text-[var(--text-muted)] truncate">
                {resource.description}
              </p>
            )}
          </div>
        </a>

        {canManage && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Edit"
            >
              <PencilSimple className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--destructive)] transition-colors disabled:opacity-50"
              title="Delete"
            >
              <Trash className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Text or Rules resource — expandable content
  return (
    <div>
      <button
        onClick={() => setIsContentExpanded(!isContentExpanded)}
        className="w-full flex items-center gap-2 py-1.5 rounded transition-colors hover:bg-[var(--surface-1)] px-1 -mx-1"
      >
        <Icon className="w-4 h-4 flex-shrink-0 text-[var(--text-muted)]" />
        <p className="flex-1 text-sm text-[var(--text-primary)] text-left truncate">
          {resource.title}
        </p>
        <motion.div
          animate={{ rotate: isContentExpanded ? 90 : 0 }}
          transition={{ duration: 0.15 }}
        >
          <CaretRight className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isContentExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: {
                height: { duration: 0.2, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.15, delay: 0.05 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.15, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.1 },
              },
            }}
            className="overflow-hidden"
          >
            <div className="pb-2 pt-0.5">
              {resource.resource_type === "rules" ? (
                <ol className="list-decimal list-inside space-y-0.5">
                  {resource.content
                    ?.split("\n")
                    .filter((line) => line.trim())
                    .map((rule, i) => (
                      <li key={i} className="text-xs text-[var(--text-secondary)] leading-relaxed">
                        {rule.trim()}
                      </li>
                    ))}
                </ol>
              ) : (
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
                  {resource.content}
                </p>
              )}

              {canManage && (
                <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-[var(--border)]/50">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                    title="Edit"
                  >
                    <PencilSimple className="w-3 h-3" />
                    Edit
                  </button>
                  <span className="text-[var(--text-muted)]/30 text-xs">·</span>
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--destructive)] transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CollapsibleClubResourcesProps {
  resources: ClubResource[];
  clubId: string;
  canManage?: boolean;
  defaultExpanded?: boolean;
}

export function CollapsibleClubResources({
  resources: initialResources,
  clubId,
  canManage = false,
  defaultExpanded = false,
}: CollapsibleClubResourcesProps) {
  const [isExpanded, setIsExpanded, hasHydrated] = useClubPreference(
    clubId,
    "clubResourcesExpanded",
    defaultExpanded
  );
  const [isAdding, setIsAdding] = useState(false);
  const [_resources, _setResources] = useState(initialResources);
  const [_refreshKey, setRefreshKey] = useState(0);
  // Track if user has toggled - if not, skip animation on initial render when restoring from localStorage
  const hasInteracted = useRef(false);

  // Skip animation if expanded from localStorage and user hasn't toggled yet
  const shouldAnimate = hasInteracted.current || !hasHydrated;

  const handleToggle = () => {
    hasInteracted.current = true;
    setIsExpanded(!isExpanded);
  };

  const handleResourceAdded = () => {
    setIsAdding(false);
    setRefreshKey((k) => k + 1);
    // Optimistically show the expanded state
    hasInteracted.current = true;
    setIsExpanded(true);
  };

  const handleResourceDeleted = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div>
      <button
        onClick={handleToggle}
        className="w-full group flex items-center justify-between py-2 gap-2"
      >
        <h3 className="text-sm font-semibold text-[var(--club-accent,var(--text-primary))] uppercase tracking-wide flex items-center gap-2 whitespace-nowrap">
          Club Resources
          {initialResources.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full font-medium text-sm"
              style={{
                background: "var(--surface-2)",
                color: "var(--text-secondary)",
              }}
            >
              {initialResources.length}
            </span>
          )}
        </h3>
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          <CaretRight className="h-5 w-5 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key={shouldAnimate ? "animated" : "instant"}
            initial={shouldAnimate ? { height: 0, opacity: 0 } : { height: "auto", opacity: 1 }}
            animate={{
              height: "auto",
              opacity: 1,
              transition: shouldAnimate
                ? {
                    height: { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] },
                    opacity: { duration: 0.25, delay: 0.05 },
                  }
                : { duration: 0 },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: 0.25, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.15 },
              },
            }}
            className="overflow-hidden"
          >
            <div className="rounded-lg bg-[var(--surface-1)]/50 p-3 mt-1 space-y-1">
              {initialResources.length === 0 && !isAdding && (
                <p className="text-sm text-[var(--text-muted)] text-center py-2">
                  {canManage
                    ? "No resources yet. Add links, text snippets, or club rules."
                    : "No resources added yet."}
                </p>
              )}

              {initialResources.map((resource) => (
                <ResourceItem
                  key={resource.id}
                  resource={resource}
                  canManage={canManage}
                  onDeleted={handleResourceDeleted}
                />
              ))}

              {isAdding ? (
                <AddResourceForm
                  clubId={clubId}
                  onSuccess={handleResourceAdded}
                  onCancel={() => setIsAdding(false)}
                />
              ) : (
                canManage && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => setIsAdding(true)}
                      className="flex items-center gap-1.5 text-xs font-medium py-1 text-[var(--club-accent,var(--primary))] hover:text-[var(--club-accent,var(--primary))]/80 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Resource
                    </button>
                  </div>
                )
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
