# Oryon Enterprise · Master Execution Roadmap

Este documento é o contrato de execução do produto. A ordem é deliberada e não deve ser invertida.

## Fase 1 · Design Language

Antes de elevar páginas, o Oryon estabelece uma linguagem de produto única:

- Design tokens
- Typography
- Colours
- Surfaces
- Radius
- Elevation
- Motion
- Components
- AI visual language

A implementação central vive em `src/app/globals.css` e `src/components/oryon-ui`.

Regra: novas superfícies usam o Oryon Design System e os tokens existentes. O anexo é uma biblioteca de recursos e referências, nunca uma receita visual copiada.

## Fase 2 · Application Shell

O shell estabelece o espaço de trabalho partilhado:

- Sidebar
- Header
- Command Menu
- Feature Menu / contextual previews
- Notifications
- Responsive shell
- Core navigation

O shell é permission-aware, suporta teclado, reduced motion, contexto departamental e navegação móvel.

## Fase 3 · Product Experiences

As experiências de produto seguem a mesma linguagem e ligam-se aos serviços existentes:

- Command Center
- Inbox
- My Work
- Tasks
- Projects
- Goals
- Calendar
- Chat
- Knowledge
- Forms
- Workflows
- Automations
- OryonAI
- Analytics
- Pulse
- Admin

## Fase 4 · Premiumisation + QA

A fase final transforma princípios em gates verificáveis:

- Motion audit
- States
- Accessibility
- UX
- CX
- Service Design
- Performance
- Visual regression
- Responsive QA
- Final design audit

## Non-goals

Oryon não deve:

- reconstruir a aplicação de raiz;
- trocar Next.js/React;
- trocar Firebase;
- alterar o modelo de dados só por causa de design;
- adicionar motion sem função;
- copiar Linear, Notion, Slack ou Apple;
- incorporar indiscriminadamente os componentes do anexo;
- manter linguagens visuais concorrentes;
- permitir que cada página invente o seu próprio design system.

## Oryon 10/10 · Acceptance contract

A plataforma é considerada pronta apenas quando estes critérios podem ser defendidos por evidência técnica, visual e operacional:

Architecture · 10/10
Functional consistency · 10/10
Visual hierarchy · 10/10
Art direction · 10/10
Typography · 10/10
Navigation · 10/10
Premium perception · 10/10
UI sophistication · 10/10
Brand personality · 10/10
UX · 10/10
CX · 10/10
Service Design · 10/10
Accessibility · 10/10
Responsive · 10/10
Motion · 10/10
Visual performance · 10/10

## Backend coupling principle

Uma superfície não é considerada operacional por existir visualmente. A jornada deve conservar o vínculo:

`User → Interface → Action → Backend → Event → Notification → Automation → Analytics → AI → Audit`

Quando não existir um contrato backend para uma acção, a interface deve comunicar o limite em vez de fabricar uma simulação.
