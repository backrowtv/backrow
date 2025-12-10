"use client";

import { UsersThree, Shuffle, Crown, Users, Clock } from "@phosphor-icons/react";

import type { ThemeGovernance } from "@/types/club-creation";
import type { WizardStepProps } from "./types";
import { WizardChoiceCard, WizardSegment, WizardToggleRow } from "./WizardChoiceCard";

const GOVERNANCE_OPTIONS: Array<{
  value: ThemeGovernance;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "democracy",
    label: "Democracy",
    description: "Members vote on themes",
    icon: <UsersThree className="w-5 h-5" weight="duotone" />,
  },
  {
    value: "random",
    label: "Random",
    description: "A theme is picked from the pool",
    icon: <Shuffle className="w-5 h-5" weight="duotone" />,
  },
  {
    value: "autocracy",
    label: "Autocracy",
    description: "Admins pick the theme",
    icon: <Crown className="w-5 h-5" weight="duotone" />,
  },
];

const NOMINATION_OPTIONS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 5, label: "5" },
];

export function StepHowItRuns({ state, updateState }: WizardStepProps) {
  const isStandard = state.festivalType === "standard";
  const competitiveEnabled = state.scoringEnabled;

  const handleCompetitiveChange = (enabled: boolean) => {
    updateState({
      scoringEnabled: enabled,
      seasonStandingsEnabled: enabled,
      nominationGuessing: enabled && state.blindNominations,
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-8 md:grid-cols-2">
        <section className="space-y-3">
          <div className="space-y-0.5">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Theme selection
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              How the group picks a theme each cycle
            </p>
          </div>
          <div className="space-y-2">
            {GOVERNANCE_OPTIONS.map((opt) => (
              <WizardChoiceCard
                key={opt.value}
                icon={opt.icon}
                title={opt.label}
                description={opt.description}
                selected={state.themeGovernance === opt.value}
                onClick={() => updateState({ themeGovernance: opt.value })}
              />
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="space-y-3">
            <div className="space-y-0.5">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Nominations per member
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                How many movies each member can nominate
              </p>
            </div>
            <WizardSegment
              options={NOMINATION_OPTIONS}
              value={state.maxNominationsPerUser}
              onChange={(value) => updateState({ maxNominationsPerUser: value })}
            />
          </div>

          <div className="space-y-3">
            <div className="space-y-0.5">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Blind nominations
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Hide who nominated each movie until the reveal
              </p>
            </div>
            <WizardToggleRow
              title={state.blindNominations ? "On" : "Off"}
              description={
                state.blindNominations
                  ? "Nominators are hidden until results"
                  : "Nominators are visible"
              }
              checked={state.blindNominations}
              onChange={(checked) => updateState({ blindNominations: checked })}
            />
          </div>
        </section>
      </div>

      {isStandard && (
        <div className="grid gap-8 md:grid-cols-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
          <section className="space-y-3 pt-5">
            <div className="space-y-0.5">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Timing
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                How festival phases progress
              </p>
            </div>
            <div className="space-y-2">
              <WizardChoiceCard
                icon={<Users className="w-5 h-5" weight="duotone" />}
                title="Manual"
                description="Admins advance each phase when ready"
                selected={state.timingMode === "manual"}
                onClick={() => updateState({ timingMode: "manual" })}
              />
              <WizardChoiceCard
                icon={<Clock className="w-5 h-5" weight="duotone" />}
                title="Scheduled"
                description="Phases advance automatically on deadlines"
                selected={state.timingMode === "scheduled"}
                onClick={() => updateState({ timingMode: "scheduled" })}
              />
            </div>
            <WizardToggleRow
              title="Auto-start next festival"
              description="Begin a new festival automatically when one ends"
              checked={state.autoStartNextFestival}
              onChange={(checked) => updateState({ autoStartNextFestival: checked })}
            />
          </section>

          <section className="space-y-3 pt-5">
            <div className="space-y-0.5">
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Competition
              </p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Scoring, standings, and (if blind) nomination guessing
              </p>
            </div>
            <WizardToggleRow
              title="Competitive mode"
              description={
                competitiveEnabled
                  ? "Points, standings, and guessing are active"
                  : "Casual mode — no points or standings"
              }
              checked={competitiveEnabled}
              onChange={handleCompetitiveChange}
            />
          </section>
        </div>
      )}
    </div>
  );
}
