"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { createPoll } from "@/app/actions/clubs";
import { ThumbsUp, Plus, X, CircleNotch } from "@phosphor-icons/react";

interface QuickPollModalProps {
  clubId: string;
  trigger?: React.ReactNode;
  variant?: "default" | "subtle";
}

export function QuickPollModal({ clubId, trigger, variant = "default" }: QuickPollModalProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const questionInputRef = useRef<HTMLTextAreaElement>(null);

  // Form state
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [expiresAt, setExpiresAt] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const defaultTrigger =
    variant === "subtle" ? (
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ThumbsUp className="h-3 w-3 mr-1" />
        Poll
      </Button>
    ) : (
      <Button>
        <ThumbsUp className="h-4 w-4 mr-2" />
        Create Poll
      </Button>
    );

  const resetForm = () => {
    setQuestion("");
    setOptions(["", ""]);
    setExpiresAt("");
    setIsAnonymous(false);
    setAllowMultiple(false);
    setError(null);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const validOptions = options.filter((opt) => opt.trim().length > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!question.trim()) {
      setError("Question is required");
      return;
    }

    if (validOptions.length < 2) {
      setError("At least 2 options are required");
      return;
    }

    const formData = new FormData();
    formData.append("clubId", clubId);
    formData.append("question", question.trim());
    formData.append("options", JSON.stringify(validOptions));
    formData.append("isAnonymous", isAnonymous.toString());
    formData.append("allowMultiple", allowMultiple.toString());
    if (expiresAt) {
      formData.append("expiresAt", expiresAt);
    }

    startTransition(async () => {
      const result = await createPoll(null, formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
      } else {
        resetForm();
        setOpen(false);
        router.refresh();
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        setOpen(newOpen);
        if (!newOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ThumbsUp className="h-5 w-5" />
            Quick Poll
          </DialogTitle>
          <DialogDescription>Ask your club members a question and let them vote.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Question */}
          <div className="space-y-2">
            <Label htmlFor="question">Question *</Label>
            <Textarea
              ref={questionInputRef}
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What would you like to ask?"
              rows={2}
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label>Options (at least 2) *</Label>
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeOption(index)}
                    aria-label={`Remove option ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addOption} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label htmlFor="expiresAt">Poll Deadline (optional)</Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
            <p className="text-xs text-[var(--text-muted)]">
              Leave empty to keep the poll open indefinitely
            </p>
          </div>

          {/* Poll Options: Multi-select and Anonymous */}
          <div className="relative">
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="flex items-center gap-2">
                <Switch
                  id="allowMultiple"
                  checked={allowMultiple}
                  onCheckedChange={setAllowMultiple}
                />
                <Label htmlFor="allowMultiple" className="text-sm cursor-pointer">
                  Multi-select
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="isAnonymous" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                <Label htmlFor="isAnonymous" className="text-sm cursor-pointer">
                  Anonymous
                </Label>
              </div>
            </div>
            <p
              className={`absolute left-0 top-full mt-1 text-sm text-[var(--destructive)] ${!error ? "invisible pointer-events-none" : ""}`}
            >
              {error}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || validOptions.length < 2}>
              {isPending ? (
                <>
                  <CircleNotch className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Poll"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
