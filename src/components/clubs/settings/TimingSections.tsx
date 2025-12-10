'use client'

/**
 * Timing Helper Components for Settings Form
 *
 * These components handle phase timing configuration for festivals.
 */

import { ClockCounterClockwise } from '@phosphor-icons/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Text } from '@/components/ui/typography'
import type { TimingSectionProps, TimingConfig, RetentionConfig } from './types'

/**
 * Nomination Phase Timing Section
 */
export function NominationTimingSection({
  localSettings,
  updateSetting
}: TimingSectionProps) {
  const nominationTiming = (localSettings.nomination_timing as TimingConfig) || { type: 'manual' }

  const updateNominationTiming = (updates: Partial<TimingConfig>) => {
    updateSetting('nomination_timing', { ...nominationTiming, ...updates })
  }

  return (
    <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="mb-4">
        <Label className="text-base font-medium">Nomination Phase Timing</Label>
        <Text size="sm" muted>
          Control when the nomination phase ends.
        </Text>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Timing Type</Label>
          <RadioGroup
            value={nominationTiming.type || 'manual'}
            onValueChange={(value) => updateNominationTiming({ type: value as TimingConfig['type'] })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="nom-manual" />
              <Label htmlFor="nom-manual">Manual (Admin advances phases)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="duration" id="nom-duration" />
              <Label htmlFor="nom-duration">Duration (Auto-advance after time period)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="scheduled" id="nom-scheduled" />
              <Label htmlFor="nom-scheduled">Scheduled (Auto-advance at specific date/time)</Label>
            </div>
          </RadioGroup>
        </div>

        {nominationTiming.type === 'duration' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="nomDurationValue">Duration</Label>
                <Input
                  id="nomDurationValue"
                  type="number"
                  min="1"
                  value={nominationTiming.duration_days || nominationTiming.duration_weeks || nominationTiming.duration_months || 7}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1
                    if (nominationTiming.duration_weeks) {
                      updateNominationTiming({ duration_weeks: value })
                    } else if (nominationTiming.duration_months) {
                      updateNominationTiming({ duration_months: value })
                    } else {
                      updateNominationTiming({ duration_days: value })
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nomDurationUnit">Unit</Label>
                <Select
                  id="nomDurationUnit"
                  value={nominationTiming.duration_months ? 'months' : nominationTiming.duration_weeks ? 'weeks' : 'days'}
                  onChange={(e) => {
                    const value = nominationTiming.duration_days || nominationTiming.duration_weeks || nominationTiming.duration_months || 7
                    if (e.target.value === 'months') {
                      updateNominationTiming({ duration_months: value, duration_weeks: undefined, duration_days: undefined })
                    } else if (e.target.value === 'weeks') {
                      updateNominationTiming({ duration_weeks: value, duration_months: undefined, duration_days: undefined })
                    } else {
                      updateNominationTiming({ duration_days: value, duration_weeks: undefined, duration_months: undefined })
                    }
                  }}
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </Select>
              </div>
            </div>
          </div>
        )}

        {nominationTiming.type === 'scheduled' && (
          <div className="space-y-2">
            <Label htmlFor="nomScheduledDateTime">Scheduled Date/Time</Label>
            <Input
              id="nomScheduledDateTime"
              type="datetime-local"
              value={nominationTiming.scheduled_datetime ? new Date(nominationTiming.scheduled_datetime).toISOString().slice(0, 16) : ''}
              onChange={(e) => updateNominationTiming({ scheduled_datetime: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Watch & Rate Phase Timing Section
 */
export function WatchRateTimingSection({
  localSettings,
  updateSetting
}: TimingSectionProps) {
  const watchRateTiming = (localSettings.watch_rate_timing as TimingConfig) || { type: 'manual' }

  const updateWatchRateTiming = (updates: Partial<TimingConfig>) => {
    updateSetting('watch_rate_timing', { ...watchRateTiming, ...updates })
  }

  return (
    <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="mb-4">
        <Label className="text-base font-medium">Watch & Rate Phase Timing</Label>
        <Text size="sm" muted>
          Control when the watch & rate phase ends.
        </Text>
      </div>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Timing Type</Label>
          <RadioGroup
            value={watchRateTiming.type || 'manual'}
            onValueChange={(value) => updateWatchRateTiming({ type: value as TimingConfig['type'] })}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="watch-manual" />
              <Label htmlFor="watch-manual">Manual (Admin advances phases)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="duration" id="watch-duration" />
              <Label htmlFor="watch-duration">Duration (Auto-advance after time period)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="scheduled" id="watch-scheduled" />
              <Label htmlFor="watch-scheduled">Scheduled (Auto-advance at specific date/time)</Label>
            </div>
          </RadioGroup>
        </div>

        {watchRateTiming.type === 'duration' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="watchDurationValue">Duration</Label>
                <Input
                  id="watchDurationValue"
                  type="number"
                  min="1"
                  value={watchRateTiming.duration_days || watchRateTiming.duration_weeks || watchRateTiming.duration_months || 7}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1
                    if (watchRateTiming.duration_weeks) {
                      updateWatchRateTiming({ duration_weeks: value })
                    } else if (watchRateTiming.duration_months) {
                      updateWatchRateTiming({ duration_months: value })
                    } else {
                      updateWatchRateTiming({ duration_days: value })
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="watchDurationUnit">Unit</Label>
                <Select
                  id="watchDurationUnit"
                  value={watchRateTiming.duration_months ? 'months' : watchRateTiming.duration_weeks ? 'weeks' : 'days'}
                  onChange={(e) => {
                    const value = watchRateTiming.duration_days || watchRateTiming.duration_weeks || watchRateTiming.duration_months || 7
                    if (e.target.value === 'months') {
                      updateWatchRateTiming({ duration_months: value, duration_weeks: undefined, duration_days: undefined })
                    } else if (e.target.value === 'weeks') {
                      updateWatchRateTiming({ duration_weeks: value, duration_months: undefined, duration_days: undefined })
                    } else {
                      updateWatchRateTiming({ duration_days: value, duration_weeks: undefined, duration_months: undefined })
                    }
                  }}
                >
                  <option value="days">Days</option>
                  <option value="weeks">Weeks</option>
                  <option value="months">Months</option>
                </Select>
              </div>
            </div>
          </div>
        )}

        {watchRateTiming.type === 'scheduled' && (
          <div className="space-y-2">
            <Label htmlFor="watchScheduledDateTime">Scheduled Date/Time</Label>
            <Input
              id="watchScheduledDateTime"
              type="datetime-local"
              value={watchRateTiming.scheduled_datetime ? new Date(watchRateTiming.scheduled_datetime).toISOString().slice(0, 16) : ''}
              onChange={(e) => updateWatchRateTiming({ scheduled_datetime: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Recently Watched Retention Section (Endless Festivals)
 */
export function RecentlyWatchedRetentionSection({
  localSettings,
  updateSetting
}: TimingSectionProps) {
  const retention = (localSettings.recently_watched_retention as RetentionConfig) || { value: 7, unit: 'days' }

  const updateRetention = (updates: Partial<RetentionConfig>) => {
    updateSetting('recently_watched_retention', { ...retention, ...updates })
  }

  return (
    <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <ClockCounterClockwise className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
          <Label className="text-base font-medium">Recently Watched Display</Label>
        </div>
        <Text size="sm" muted>
          Control how long concluded movies appear in the &quot;Recently Watched&quot; section. Movies remain in club history and activity feeds regardless of this setting.
        </Text>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="retentionValue">Duration</Label>
            <Input
              id="retentionValue"
              type="number"
              min="1"
              max="365"
              value={retention.value || 7}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 7
                updateRetention({ value })
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retentionUnit">Unit</Label>
            <Select
              id="retentionUnit"
              value={retention.unit || 'days'}
              onChange={(e) => {
                updateRetention({ unit: e.target.value as RetentionConfig['unit'] })
              }}
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </Select>
          </div>
        </div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--surface-1)', border: '1px solid var(--border)' }}>
          <Text size="sm" muted>
            <strong>Note:</strong> Admins can also manually hide movies from Recently Watched using the X button on each poster.
          </Text>
        </div>
      </div>
    </div>
  )
}
