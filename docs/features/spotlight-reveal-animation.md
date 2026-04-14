# Spotlight Mode - Theater Curtain Reveal Animation

**Status:** Partially Implemented  
**Last Updated:** December 2025  
**Related:** [`ARCHITECTURE.md § 4 Festival State Machine`](../../ARCHITECTURE.md#4-festival-state-machine) — festival mode context

## Concept

When results are revealed in **SPOTLIGHT** mode, the winner should be revealed with a dramatic theater curtain opening animation, followed by a spotlight illuminating the winner.

**Current Implementation:**

- Setting exists in club settings (`spotlight_animation_enabled`)
- Referenced in festival mode descriptions
- Theater curtain illustration component exists (`CinemaCurtainsIllustration`)
- Full animation implementation pending

## Visual Design

### Animation Sequence

1. **Curtains Closed** - Theater curtains are drawn closed, obscuring the results
2. **Curtain Opening** - Curtains slowly draw open (animated)
3. **Spotlight Reveal** - A spotlight beam illuminates the winning movie/poster
4. **Winner Display** - Winner is displayed prominently with spotlight effect

### Technical Implementation Notes

- Use CSS animations or Framer Motion for smooth curtain opening
- Spotlight effect can use CSS gradients/radial gradients
- Consider adding subtle theater ambiance (optional sound effects)
- Animation should be smooth and cinematic (2-3 seconds total)
- Should work on both desktop and mobile

## Where to Implement

- **Results Page** (`/clubs/[id]/festivals/[festivalId]/results`)
- Only show for SPOTLIGHT mode festivals
- Trigger when results phase begins or when user clicks "Reveal Results"

## Design Inspiration

- Classic movie theater curtain opening
- Award show spotlight reveals
- Film festival winner announcements

## Future Enhancements

- Customizable curtain colors/styles
- Different spotlight effects
- Sound effects (optional, user preference)
- Confetti/celebration effects after reveal
