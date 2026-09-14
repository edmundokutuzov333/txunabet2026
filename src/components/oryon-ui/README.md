# Oryon Design System 2.0

This directory is the presentation layer contract for Oryon Enterprise.

## Principles

- Surfaces are layered: Surface 0, 1, 2, 3.
- Oryon Lime is reserved for primary action, active state, focus, intelligence and positive operational signal.
- Semantic warning and danger colours are reserved for actual state meaning, never decoration.
- Radius is controlled: 6px controls, 8px inputs, 10px cards, 12px panels, 14px dialogs.
- Elevation uses named levels instead of arbitrary `shadow-2xl` values.
- Motion is functional: 160-200ms micro interactions, 320ms surface transitions, 400ms only for deliberate emphasis. Springs are reserved for spatial continuity.
- Reduced motion is a first-class requirement.
- New product surfaces should import from `@/components/oryon-ui` instead of inventing local visual primitives.

## Public catalogue

`OryonButton`, `OryonIconButton`, `OryonInput`, `OryonSelect`, `OryonSwitch`, `OryonBadge`, `OryonStatus`, `OryonCard`, `OryonPanel`, `OryonDialog`, `OryonSheet`, `OryonPopover`, `OryonCommand`, `OryonTabs`, `OryonTable`, `OryonDataGrid`, `OryonTimeline`, `OryonActivity`, `OryonEntityHeader`, `OryonInspector`, `OryonEmptyState`, `OryonSkeleton`, `OryonToast`, `OryonNotificationPanel`, `OryonPinnedList`, `OryonAIResponse`, `OryonRiskCard`.

The visual utilities supplied in the design reference are also adapted into the same language: `GradientWaveText`, `SlideUpText`, `ShimmerText` and `BorderBeam`.

## Usage

```tsx
import { OryonButton, OryonPanel, OryonStatus } from '@/components/oryon-ui';
```

Business/data flow remains outside this layer. Components accept data and callbacks and do not own repositories, Firebase operations or domain policy.
