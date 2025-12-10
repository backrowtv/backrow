"use client";

import { createPoll } from "@/app/actions/clubs";
import { useActionState, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Sparkle, ListBullets } from "@phosphor-icons/react";
import type { EventType } from "@/app/actions/events";

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: "watch_party", label: "Watch Party" },
  { value: "discussion", label: "Discussion" },
  { value: "meetup", label: "Meetup" },
  { value: "custom", label: "Custom Event" },
];

interface PollFormProps {
  clubId: string;
  onSuccess?: () => void;
}

type FormState = { error?: string; success?: boolean } | null;
type PollType = "standard" | "event";

export function PollForm({ clubId, onSuccess }: PollFormProps) {
  const [state, formAction, isPending] = useActionState<FormState, FormData>(createPoll, null);
  const [pollType, setPollType] = useState<PollType>("standard");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [expiresAt, setExpiresAt] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventType, setEventType] = useState<EventType>("watch_party");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [allowMultiple, setAllowMultiple] = useState(false);

  // Reset form on success - must be in useEffect to avoid infinite re-renders
  useEffect(() => {
    if (state && "success" in state && state.success) {
      if (onSuccess) onSuccess();
      setQuestion("");
      setOptions(["", ""]);
      setExpiresAt("");
      setEventTitle("");
      setEventDescription("");
      setEventType("watch_party");
      setPollType("standard");
      setIsAnonymous(false);
      setAllowMultiple(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Depends on state?.success not the full state object to avoid re-running on unrelated state changes
  }, [state?.success, onSuccess]);

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

  const handleSubmit = (formData: FormData) => {
    const validOptions = options.filter((opt) => opt.trim().length > 0);
    if (validOptions.length < 2) {
      return;
    }
    formData.set("options", JSON.stringify(validOptions));

    // Add action data if Event Builder mode
    if (pollType === "event") {
      formData.set("actionType", "create_event");
      formData.set(
        "actionData",
        JSON.stringify({
          title: eventTitle,
          description: eventDescription,
          event_type: eventType,
        })
      );
    }

    formAction(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Poll</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="clubId" value={clubId} />
          <input type="hidden" name="isAnonymous" value={isAnonymous.toString()} />
          <input type="hidden" name="allowMultiple" value={allowMultiple.toString()} />

          {/* Poll Type Toggle */}
          <div className="space-y-2">
            <Label>Poll Type</Label>
            <Tabs
              value={pollType}
              onValueChange={(value) => setPollType(value as PollType)}
              className="w-full"
            >
              <TabsList className="w-full grid grid-cols-2 h-10 bg-[var(--surface-1)]">
                <TabsTrigger
                  value="standard"
                  className="gap-2 text-sm data-[state=active]:bg-[var(--surface-2)]"
                >
                  <ListBullets className="w-4 h-4" />
                  Standard Poll
                </TabsTrigger>
                <TabsTrigger
                  value="event"
                  className="gap-2 text-sm data-[state=active]:bg-[var(--surface-2)]"
                >
                  <Sparkle className="w-4 h-4" />
                  Event Builder
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {pollType === "event" && (
              <p className="text-xs text-[var(--text-muted)]">
                The winning option will automatically create an event
              </p>
            )}
          </div>

          {/* Poll Options: Multi-select and Anonymous */}
          <div className="space-y-4 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allowMultiple">Allow multiple selections</Label>
                <p className="text-xs text-[var(--text-muted)]">
                  Members can vote for more than one option
                </p>
              </div>
              <Switch
                id="allowMultiple"
                checked={allowMultiple}
                onCheckedChange={setAllowMultiple}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isAnonymous">Anonymous voting</Label>
                <p className="text-xs text-[var(--text-muted)]">Hide who voted for each option</p>
              </div>
              <Switch id="isAnonymous" checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>
          </div>

          {/* Event Details (only for Event Builder) */}
          {pollType === "event" && (
            <>
              <div className="space-y-2">
                <Select
                  id="eventType"
                  label="Event Type"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EventType)}
                >
                  {EVENT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventTitle">Event Title</Label>
                <Input
                  id="eventTitle"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  placeholder="e.g., Watch Party: Dune"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventDescription">Event Description (Optional)</Label>
                <Textarea
                  id="eventDescription"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  placeholder="Add details about the event..."
                  rows={2}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Textarea
              id="question"
              name="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={
                pollType === "event" ? "When should we meet?" : "What would you like to ask?"
              }
              rows={2}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>
              {pollType === "event" ? "Date/Time Options (at least 2)" : "Options (at least 2)"}
            </Label>
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type={pollType === "event" ? "datetime-local" : "text"}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={
                    pollType === "event" ? "Select date and time" : `Option ${index + 1}`
                  }
                  required
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

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Poll Deadline</Label>
            <Input
              id="expiresAt"
              name="expiresAt"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              required={pollType === "event"}
            />
            {pollType === "event" && (
              <p className="text-xs text-[var(--text-muted)]">
                Event will be created when this deadline passes
              </p>
            )}
          </div>

          {state && "error" in state && state.error && (
            <div className="text-sm text-[var(--destructive)]">{state.error}</div>
          )}

          <Button
            type="submit"
            variant="club-accent"
            disabled={isPending || options.filter((opt) => opt.trim().length > 0).length < 2}
          >
            {isPending ? "Creating..." : "Create Poll"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
