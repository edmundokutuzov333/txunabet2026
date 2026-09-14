# Oryon Phase 4 QA Gate

## Purpose

Phase 4 is the final product-polish gate. A surface is considered ready only when its functional flow, visual language, interaction states, accessibility, responsive behavior, and service consequences remain coherent together.

## Motion audit

| Class | Allowed use | Gate |
| --- | --- | --- |
| feedback | save, validation, error, success, selection | Must explain immediate system response |
| transition | navigation, sheet, dialog, inspector | Must preserve spatial continuity |
| hierarchy | reveal priority, AI processing, contextual emphasis | Must improve information order |
| orientation | context changes, panel opening, responsive shell | Must help users understand where they are |
| celebration | meaningful completion only | Never decorative noise |
| AI processing | analysis, generation, tool execution | Must expose progress and completion |

Animations without a clear purpose are removed. Reduced motion is a first-class state.

## State audit

Each interactive surface must account for: default, hover, focus, pressed, selected, disabled, loading, success, error, empty, offline.

The implementation should prefer semantic state over purely visual decoration and must not hide recoverable errors behind transient toasts alone.

## UX journey model

Every important journey is checked through:

discover -> understand -> act -> confirm -> recover -> continue

Example Create Task:

Create Task -> Form -> Validation -> Save -> Confirmation -> Task visible -> Activity -> Notification -> Search -> AI Context

The final step matters: an action becomes part of the wider operating system instead of ending at the submit button.

## CX audit

The service is reviewed across the employee lifecycle:

- first entry
- first login
- first task
- first meeting
- first error
- first notification
- first OryonAI use
- first workflow
- first search
- first week

The target is continuity of language, feedback, trust, recoverability, and context across these moments.

## Service Design blueprint

User
-> Interface
-> Action
-> Backend
-> Event
-> Notification
-> Automation
-> Analytics
-> AI
-> Audit

Each meaningful enterprise action should leave an operational trace that can be inspected, aggregated, automated, or interpreted by Oryon Intelligence according to authorization.

## Accessibility gate

Keyboard operation, visible focus, contrast, semantic structure, labels, ARIA state, screen-reader naming, reduced motion, and minimum hit areas are part of acceptance, not a later enhancement.

## Performance visual gate

Premium styling must remain computationally restrained. Avoid unnecessary blur, continuous animation, expensive paint effects, layout shifts, oversized DOM trees, unbounded lists, and eager loading of large media. Loading states use stable skeleton geometry when useful.

## Visual regression matrix

The Playwright suite covers:

- Login
- Command Center
- Inbox
- Search
- Tasks
- Projects
- Chat
- Knowledge / Docs / Files
- Forms
- Workflow Builder
- OryonAI
- Analytics
- Pulse
- Admin
- Settings

Viewports: 1440, 1280, 1024, 390, 430.
Themes: dark and light.

Authenticated visual comparison is enabled with `E2E_EMAIL`, `E2E_PASSWORD`, and `VISUAL_REGRESSION=1`. Baselines should be generated intentionally and reviewed, never accepted blindly.

## Design QA gate

Architecture

Consistency

Hierarchy

Typography

Navigation

Interaction

Motion

Accessibility

Responsive

Data density

Brand

Performance

No surface is signed off when a criterion fails.
