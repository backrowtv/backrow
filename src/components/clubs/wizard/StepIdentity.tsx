"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarEditor } from "@/components/ui/avatar-editor";
import { ClubThemeColorPicker } from "@/components/clubs/ClubThemeColorPicker";
import { GenreSelector } from "@/components/genres/GenreSelector";

import type { WizardStepProps } from "./types";

export function StepIdentity({ state, updateState }: WizardStepProps) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3">
        <AvatarEditor
          mode="club"
          displayName={state.name || "Your Club"}
          currentPhotoUrl={state.avatarPreview}
          selectedIcon={state.avatarIcon}
          selectedColorIndex={state.avatarColorIndex}
          selectedBorderColorIndex={state.avatarBorderColorIndex}
          hasUploadedPhoto={!!state.avatarPreview}
          triggerSize="xxl"
          onSelect={(icon, colorIndex, borderColorIndex) =>
            updateState({
              avatarIcon: icon,
              avatarColorIndex: colorIndex,
              avatarBorderColorIndex: borderColorIndex,
            })
          }
          onFileSelect={(file, preview) =>
            updateState({
              avatarFile: file,
              avatarPreview: preview,
              avatarIcon: "photo",
              avatarColorIndex: null,
            })
          }
        />
      </div>

      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="clubName">Club name</Label>
          <Input
            id="clubName"
            value={state.name}
            onChange={(e) => updateState({ name: e.target.value })}
            placeholder="The Midnight Society"
            maxLength={30}
          />
          {(() => {
            const trimmed = state.name.trim().length;
            const tooShort = state.name.length > 0 && trimmed < 3;
            return (
              <div className="flex items-center justify-between text-[11px]">
                <span
                  style={{
                    color: tooShort ? "var(--error)" : "var(--text-muted)",
                  }}
                >
                  {trimmed >= 3 ? " " : "At least 3 characters"}
                </span>
                <span style={{ color: "var(--text-muted)" }}>{state.name.length}/30</span>
              </div>
            );
          })()}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">
            Description{" "}
            <span className="font-normal" style={{ color: "var(--text-muted)" }}>
              (optional)
            </span>
          </Label>
          <Textarea
            id="description"
            value={state.description}
            onChange={(e) => updateState({ description: e.target.value })}
            placeholder="What's your club about?"
            rows={3}
            maxLength={300}
            className="resize-none"
          />
          <p className="text-[11px] text-right" style={{ color: "var(--text-muted)" }}>
            {state.description.length}/300
          </p>
        </div>

        <div className="space-y-1.5">
          <ClubThemeColorPicker
            value={state.themeColor}
            onChange={(color) => updateState({ themeColor: color })}
            label="Theme color"
          />
        </div>

        <GenreSelector value={state.genres} onChange={(genres) => updateState({ genres })} />
      </div>
    </div>
  );
}
