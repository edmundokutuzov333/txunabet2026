"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import {
  AlertTriangle,
  Archive,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock3,
  MoreHorizontal,
  Pin,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const controlBase = `inline-flex items-center justify-center gap-2 whitespace-nowrap border font-medium ${focusRing} transition-[background-color,border-color,color,box-shadow,transform,opacity] duration-[180ms] ease-out disabled:pointer-events-none disabled:opacity-45`;

export type OryonButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type OryonButtonSize = "sm" | "md" | "lg" | "icon";

export interface OryonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: OryonButtonVariant;
  size?: OryonButtonSize;
}

export const OryonButton = React.forwardRef<HTMLButtonElement, OryonButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants: Record<OryonButtonVariant, string> = {
      primary: "border-primary bg-primary text-primary-foreground hover:bg-primary/92 hover:shadow-[0_8px_24px_-14px_hsl(var(--primary)/0.8)] active:translate-y-px",
      secondary: "border-transparent bg-surface-2 text-foreground hover:bg-surface-3",
      outline: "border-border bg-transparent text-foreground hover:bg-surface-1 hover:border-border-strong",
      ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-surface-1 hover:text-foreground",
      danger: "border-transparent bg-[hsl(var(--status-danger))] text-white hover:brightness-110",
    };
    const sizes: Record<OryonButtonSize, string> = {
      sm: "h-8 rounded-[6px] px-3 text-xs",
      md: "h-9 rounded-[6px] px-3.5 text-[13px]",
      lg: "h-10 rounded-[6px] px-4 text-sm",
      icon: "h-9 w-9 rounded-[6px] p-0",
    };
    return <button ref={ref} className={cn(controlBase, variants[variant], sizes[size], className)} {...props} />;
  },
);
OryonButton.displayName = "OryonButton";

export interface OryonIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tone?: "default" | "primary" | "danger";
  size?: "sm" | "md";
}
export const OryonIconButton = React.forwardRef<HTMLButtonElement, OryonIconButtonProps>(
  ({ className, label, tone = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        controlBase,
        "p-0 border-transparent",
        size === "sm" ? "h-8 w-8" : "h-9 w-9",
        tone === "primary" && "bg-primary text-primary-foreground hover:brightness-105",
        tone === "danger" && "text-[hsl(var(--status-danger))] hover:bg-[hsl(var(--status-danger)/0.10)]",
        tone === "default" && "bg-transparent text-muted-foreground hover:bg-surface-1 hover:text-foreground",
        className,
      )}
      {...props}
    />
  ),
);
OryonIconButton.displayName = "OryonIconButton";

export interface OryonInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  description?: string;
  error?: string;
}
export const OryonInput = React.forwardRef<HTMLInputElement, OryonInputProps>(
  ({ className, label, description, error, id, ...props }, ref) => (
    <label className="grid gap-1.5 text-sm" htmlFor={id}>
      {label ? <span className="text-label text-foreground">{label}</span> : null}
      <input
        ref={ref}
        id={id}
        className={cn(
          `h-9 w-full rounded-[8px] border bg-surface-1 px-3 text-[13px] text-foreground placeholder:text-muted-foreground/65 ${focusRing} border-border transition-[border-color,box-shadow,background-color] duration-[180ms] hover:border-border-strong focus:border-primary/70 focus:bg-surface-2`,
          error && "border-[hsl(var(--status-danger))] focus:border-[hsl(var(--status-danger))]",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs text-[hsl(var(--status-danger))]">{error}</span> : description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
    </label>
  ),
);
OryonInput.displayName = "OryonInput";

export interface OryonSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  description?: string;
  children: React.ReactNode;
}
export const OryonSelect = React.forwardRef<HTMLSelectElement, OryonSelectProps>(
  ({ className, label, description, id, children, ...props }, ref) => (
    <label className="grid gap-1.5 text-sm" htmlFor={id}>
      {label ? <span className="text-label text-foreground">{label}</span> : null}
      <span className="relative">
        <select
          ref={ref}
          id={id}
          className={cn(`h-9 w-full appearance-none rounded-[8px] border border-border bg-surface-1 pl-3 pr-9 text-[13px] text-foreground ${focusRing} hover:border-border-strong focus:border-primary/70`, className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </span>
      {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
    </label>
  ),
);
OryonSelect.displayName = "OryonSelect";

export interface OryonSwitchProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}
export function OryonSwitch({ checked, defaultChecked, onCheckedChange, label, description, disabled }: OryonSwitchProps) {
  const [internal, setInternal] = React.useState(Boolean(defaultChecked));
  const value = checked ?? internal;
  const reduced = useReducedMotion();
  const toggle = () => {
    if (disabled) return;
    const next = !value;
    if (checked === undefined) setInternal(next);
    onCheckedChange?.(next);
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-disabled={disabled}
      onClick={toggle}
      disabled={disabled}
      className={cn("group flex min-h-9 items-center gap-3 text-left", focusRing, disabled && "cursor-not-allowed opacity-50")}
    >
      <span className={cn("relative inline-flex h-5 w-9 shrink-0 rounded-full border p-0.5 transition-colors duration-180", value ? "border-primary bg-primary/85" : "border-border bg-surface-2")}>
        <motion.span
          className={cn("block h-4 w-4 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.30)]")}
          animate={reduced ? { x: value ? 14 : 0 } : { x: value ? 14 : 0 }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 520, damping: 34, mass: 0.55 }}
        />
      </span>
      {label || description ? <span className="grid gap-0.5"><span className="text-[13px] font-medium text-foreground">{label}</span>{description ? <span className="text-xs text-muted-foreground">{description}</span> : null}</span> : null}
    </button>
  );
}

export function OryonBadge({ className, children, tone = "neutral" }: { className?: string; children: React.ReactNode; tone?: "neutral" | "accent" | "success" | "warning" | "danger" }) {
  const toneClass = {
    neutral: "border-border bg-surface-2 text-muted-foreground",
    accent: "border-primary/25 bg-primary/10 text-primary",
    success: "border-primary/25 bg-primary/10 text-primary",
    warning: "border-[hsl(var(--status-warning)/0.25)] bg-[hsl(var(--status-warning)/0.10)] text-[hsl(var(--status-warning))]",
    danger: "border-[hsl(var(--status-danger)/0.25)] bg-[hsl(var(--status-danger)/0.10)] text-[hsl(var(--status-danger))]",
  }[tone];
  return <span className={cn("inline-flex h-6 items-center rounded-full border px-2.5 text-[11px] font-medium tracking-[0.01em]", toneClass, className)}>{children}</span>;
}

export function OryonStatus({ status, label, className }: { status: "online" | "active" | "idle" | "warning" | "critical" | "offline"; label?: string; className?: string }) {
  const tone = status === "warning" ? "warning" : status === "critical" ? "danger" : status === "offline" ? "neutral" : "success";
  return <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}><span className={cn("h-1.5 w-1.5 rounded-full", tone === "warning" ? "bg-[hsl(var(--status-warning))]" : tone === "danger" ? "bg-[hsl(var(--status-danger))]" : tone === "neutral" ? "bg-muted-foreground/55" : "bg-primary")} />{label ?? status}</span>;
}

export function OryonCard({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[10px] border border-border bg-surface-1", className)}>{children}</div>;
}
export function OryonPanel({ className, children, elevated = false }: React.HTMLAttributes<HTMLDivElement> & { elevated?: boolean }) {
  return <div className={cn("rounded-[12px] border border-border bg-surface-2", elevated && "shadow-[var(--elevation-raised)]", className)}>{children}</div>;
}

export const OryonDialog = ({ trigger, title, description, children, open, onOpenChange }: { trigger?: React.ReactNode; title: string; description?: string; children: React.ReactNode; open?: boolean; onOpenChange?: (open: boolean) => void }) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out" />
      <DialogPrimitive.Content className={`fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-[14px] border border-border bg-surface-3 p-5 text-foreground shadow-[var(--elevation-modal)] ${focusRing}`}>
        <DialogPrimitive.Title className="text-h2">{title}</DialogPrimitive.Title>
        {description ? <DialogPrimitive.Description className="mt-1 text-body-small text-muted-foreground">{description}</DialogPrimitive.Description> : null}
        <div className="mt-5">{children}</div>
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-[6px] p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"><X className="h-4 w-4" /></DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);

export const OryonSheet = ({ trigger, title, children, side = "right" }: { trigger?: React.ReactNode; title: string; children: React.ReactNode; side?: "left" | "right" }) => (
  <DialogPrimitive.Root>
    {trigger ? <DialogPrimitive.Trigger asChild>{trigger}</DialogPrimitive.Trigger> : null}
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px]" />
      <DialogPrimitive.Content className={cn("fixed inset-y-0 z-50 w-[min(92vw,560px)] border-border bg-surface-2 p-5 shadow-[var(--elevation-modal)]", side === "right" ? "right-0 border-l" : "left-0 border-r")}>
        <DialogPrimitive.Title className="text-h2">{title}</DialogPrimitive.Title>
        <div className="mt-5 h-[calc(100%-48px)] overflow-y-auto custom-scrollbar">{children}</div>
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-[6px] p-1.5 text-muted-foreground hover:bg-surface-3 hover:text-foreground"><X className="h-4 w-4" /></DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
);

export const OryonPopover = ({ trigger, children, align = "end" }: { trigger: React.ReactNode; children: React.ReactNode; align?: "start" | "center" | "end" }) => (
  <PopoverPrimitive.Root>
    <PopoverPrimitive.Trigger asChild>{trigger}</PopoverPrimitive.Trigger>
    <PopoverPrimitive.Portal><PopoverPrimitive.Content align={align} sideOffset={8} className={`z-50 rounded-[10px] border border-border bg-surface-3 p-2 shadow-[var(--elevation-floating)] ${focusRing}`}>{children}</PopoverPrimitive.Content></PopoverPrimitive.Portal>
  </PopoverPrimitive.Root>
);

export const OryonCommand = ({ open, onOpenChange, placeholder = "Search Oryon...", children }: { open: boolean; onOpenChange: (open: boolean) => void; placeholder?: string; children: React.ReactNode }) => {
  const [query, setQuery] = React.useState("");
  return (
    <OryonDialog open={open} onOpenChange={onOpenChange} title="Command menu" description="Jump to work, people, knowledge and actions.">
      <div className="flex h-10 items-center gap-2 rounded-[8px] border border-border bg-surface-1 px-3 focus-within:border-primary/60"><Search className="h-4 w-4 text-muted-foreground" /><input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/65" /></div>
      <div data-command-query={query} className="mt-3 max-h-[360px] overflow-y-auto custom-scrollbar">{children}</div>
    </OryonDialog>
  );
};

export const OryonTabs = TabsPrimitive.Root;
export const OryonTabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => <TabsPrimitive.List ref={ref} className={cn("inline-flex items-center gap-0.5 border-b border-border", className)} {...props} />);
OryonTabsList.displayName = "OryonTabsList";
export const OryonTabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({ className, ...props }, ref) => <TabsPrimitive.Trigger ref={ref} className={cn("relative px-3 py-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground data-[state=active]:text-foreground after:absolute after:inset-x-2 after:bottom-[-1px] after:h-px after:rounded-full after:bg-primary after:opacity-0 data-[state=active]:after:opacity-100", focusRing, className)} {...props} />);
OryonTabsTrigger.displayName = "OryonTabsTrigger";
export const OryonTabsContent = TabsPrimitive.Content;

export function OryonTable({ className, children }: React.HTMLAttributes<HTMLTableElement>) {
  return <div className="w-full overflow-x-auto custom-scrollbar"><table className={cn("w-full border-collapse text-left text-[13px]", className)}>{children}</table></div>;
}
export function OryonDataGrid({ className, headers, rows }: { className?: string; headers: React.ReactNode[]; rows: React.ReactNode[][] }) {
  return <OryonTable className={className}><thead><tr className="border-b border-border bg-surface-2">{headers.map((header, i) => <th key={i} className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{header}</th>)}</tr></thead><tbody>{rows.map((row, r) => <tr key={r} className="border-b border-border/70 transition-colors hover:bg-surface-2/70">{row.map((cell, c) => <td key={c} className="px-3 py-2.5 align-middle text-foreground">{cell}</td>)}</tr>)}</tbody></OryonTable>;
}

export function OryonTimeline({ items, className }: { items: Array<{ title: string; meta?: string; description?: string; status?: "done" | "current" | "pending" }>; className?: string }) {
  return <div className={cn("grid gap-0", className)}>{items.map((item, index) => { const done = item.status === "done"; const current = item.status === "current"; return <div key={`${item.title}-${index}`} className="relative grid grid-cols-[20px_minmax(0,1fr)] gap-3 pb-5 last:pb-0"><div className="relative flex justify-center">{index < items.length - 1 ? <span className="absolute top-5 h-[calc(100%-12px)] w-px bg-border" /> : null}<span className={cn("relative mt-1 grid h-4 w-4 place-items-center rounded-full border", done && "border-primary bg-primary text-primary-foreground", current && "border-primary/70 bg-primary/10 text-primary", !done && !current && "border-border bg-surface-1 text-muted-foreground")}>{done ? <Check className="h-2.5 w-2.5" /> : current ? <Circle className="h-1.5 w-1.5 fill-current" /> : null}</span></div><div><div className="flex items-center gap-2"><span className="text-[13px] font-medium text-foreground">{item.title}</span>{item.meta ? <span className="text-[11px] text-muted-foreground">{item.meta}</span> : null}</div>{item.description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p> : null}</div></div>; })}</div>;
}

export function OryonActivity({ items, className }: { items: Array<{ actor: string; action: string; target?: string; time: string; avatar?: string }>; className?: string }) {
  return <div className={cn("divide-y divide-border", className)}>{items.map((item) => <div key={`${item.actor}-${item.time}-${item.action}`} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"><div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-surface-2 text-[11px] font-semibold text-muted-foreground">{item.avatar ? <img src={item.avatar} alt="" className="h-full w-full object-cover" /> : item.actor.slice(0, 1)}</div><div className="min-w-0 flex-1"><p className="text-[13px] leading-5 text-foreground"><span className="font-semibold">{item.actor}</span> <span className="text-muted-foreground">{item.action}</span>{item.target ? <span className="font-medium"> {item.target}</span> : null}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{item.time}</p></div></div>)}</div>;
}

export function OryonEntityHeader({ icon, title, subtitle, meta, actions }: { icon?: React.ReactNode; title: string; subtitle?: string; meta?: React.ReactNode; actions?: React.ReactNode }) {
  return <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3">{icon ? <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] border border-border bg-surface-1 text-primary">{icon}</div> : null}<div className="min-w-0"><h1 className="truncate text-h1">{title}</h1>{subtitle ? <p className="mt-1 text-body-small text-muted-foreground">{subtitle}</p> : null}{meta ? <div className="mt-2">{meta}</div> : null}</div></div>{actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}</header>;
}

export function OryonInspector({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return <aside className="flex h-full min-w-0 flex-col rounded-[12px] border border-border bg-surface-2"><div className="flex h-11 items-center justify-between border-b border-border px-4"><h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</h2><OryonIconButton label="Close inspector" size="sm"><X className="h-4 w-4" /></OryonIconButton></div><div className="min-h-0 flex-1 overflow-y-auto p-4 custom-scrollbar">{children}</div>{footer ? <div className="border-t border-border p-3">{footer}</div> : null}</aside>;
}

export function OryonEmptyState({ icon = <Archive className="h-5 w-5" />, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[10px] border border-dashed border-border bg-surface-1/50 px-6 py-12 text-center"><div className="grid h-10 w-10 place-items-center rounded-[10px] border border-border bg-surface-2 text-muted-foreground">{icon}</div><h3 className="mt-4 text-[13px] font-semibold text-foreground">{title}</h3>{description ? <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p> : null}{action ? <div className="mt-4">{action}</div> : null}</div>;
}

export function OryonSkeleton({ className }: { className?: string }) { return <div aria-hidden className={cn("animate-pulse rounded-[6px] bg-surface-2", className)} />; }

export function OryonToast({ title, description, tone = "default", action, onClose }: { title: string; description?: string; tone?: "default" | "success" | "danger"; action?: React.ReactNode; onClose?: () => void }) {
  return <div role="status" className="flex w-[min(420px,calc(100vw-32px))] items-start gap-3 rounded-[10px] border border-border bg-surface-3 p-3.5 shadow-[var(--elevation-floating)]"><div className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-[8px]", tone === "danger" ? "bg-[hsl(var(--status-danger)/0.12)] text-[hsl(var(--status-danger))]" : tone === "success" ? "bg-primary/10 text-primary" : "bg-surface-2 text-muted-foreground")}>{tone === "danger" ? <AlertTriangle className="h-4 w-4" /> : tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : <Bell className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-foreground">{title}</p>{description ? <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p> : null}{action ? <div className="mt-2">{action}</div> : null}</div>{onClose ? <OryonIconButton label="Dismiss" size="sm" onClick={onClose}><X className="h-4 w-4" /></OryonIconButton> : null}</div>;
}

export type PinnedListItem = { id: string; name: string; subtitle?: string; icon?: React.ReactNode };
export function OryonPinnedList({ items, onPinnedChange }: { items: PinnedListItem[]; onPinnedChange?: (ids: string[]) => void }) {
  const [pinnedIds, setPinnedIds] = React.useState<Set<string>>(new Set());
  const reduced = useReducedMotion();
  const toggle = (id: string) => setPinnedIds((previous) => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); onPinnedChange?.([...next]); return next; });
  const pinned = items.filter((item) => pinnedIds.has(item.id));
  const rest = items.filter((item) => !pinnedIds.has(item.id));
  const groups = [{ label: pinned.length ? "Pinned" : "", items: pinned }, { label: rest.length ? "All items" : "", items: rest }].filter((group) => group.items.length);
  return <div className="flex flex-col gap-1.5">{groups.map((group) => <div key={group.label || "all"}>{group.label ? <p className="mb-1 px-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-muted-foreground">{group.label}</p> : null}<AnimatePresence initial={false} mode="popLayout">{group.items.map((item) => <motion.div key={item.id} layout={!reduced} initial={reduced ? false : { opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }} transition={reduced ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }} className="group flex items-center gap-3 rounded-[10px] border border-transparent px-3 py-2.5 hover:border-border hover:bg-surface-2"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-border bg-surface-1 text-muted-foreground">{item.icon ?? <Circle className="h-3.5 w-3.5" />}</div><div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-foreground">{item.name}</p>{item.subtitle ? <p className="truncate text-[11px] text-muted-foreground">{item.subtitle}</p> : null}</div><OryonIconButton label={pinnedIds.has(item.id) ? `Unpin ${item.name}` : `Pin ${item.name}`} size="sm" tone={pinnedIds.has(item.id) ? "primary" : "default"} onClick={() => toggle(item.id)}><Pin className={cn("h-3.5 w-3.5 transition-transform duration-180", pinnedIds.has(item.id) && "-rotate-45")} /></OryonIconButton></motion.div>)}</AnimatePresence></div>)}</div>;
}

export type NotificationKind = "mention" | "comment" | "edit" | "file" | "request" | "join" | "created" | "due";
export type NotificationPiece = string | { entity: string };
export type NotificationAction = { id: string; label: string; tone?: "primary" | "quiet"; resolved?: string };
export type NotificationItem = { id: string; actor: { name: string; avatar?: string }; kind: NotificationKind; body: NotificationPiece[]; time: string; context?: string[]; unread?: boolean; archived?: boolean; following?: boolean; count?: number; quote?: string; actions?: NotificationAction[] };

const notificationIcon: Record<NotificationKind, React.ReactNode> = { mention: <Sparkles className="h-3.5 w-3.5" />, comment: <Circle className="h-3.5 w-3.5 fill-current" />, edit: <Circle className="h-3.5 w-3.5" />, file: <Archive className="h-3.5 w-3.5" />, request: <Clock3 className="h-3.5 w-3.5" />, join: <CheckCircle2 className="h-3.5 w-3.5" />, created: <Check className="h-3.5 w-3.5" />, due: <Clock3 className="h-3.5 w-3.5" /> };

export function OryonNotificationPanel({ items: initialItems, maxHeight = 520, className, onOpenItem, onAction, onReadChange, onArchiveChange, onMarkAllRead }: { items: NotificationItem[]; maxHeight?: number; className?: string; onOpenItem?: (item: NotificationItem) => void; onAction?: (item: NotificationItem, actionId: string) => void; onReadChange?: (item: NotificationItem, unread: boolean) => void; onArchiveChange?: (item: NotificationItem, archived: boolean) => void; onMarkAllRead?: () => void }) {
  const [items, setItems] = React.useState(initialItems);
  const [tab, setTab] = React.useState<"all" | "following" | "archived">("all");
  const [resolved, setResolved] = React.useState<Record<string, string>>({});
  const reduced = useReducedMotion();
  const shown = items.filter((item) => tab === "archived" ? item.archived : !item.archived && (tab === "following" ? item.following : true));
  const patch = (id: string, patchValue: Partial<NotificationItem>) => setItems((current) => current.map((item) => item.id === id ? { ...item, ...patchValue } : item));
  return <div className={cn("overflow-hidden rounded-[12px] border border-border bg-surface-2", className)}>
    <div className="flex items-center justify-between border-b border-border px-3"><div className="flex items-center gap-1">{([['all', 'All'], ['following', 'Following'], ['archived', 'Archived']] as const).map(([value, label]) => <button type="button" key={value} onClick={() => setTab(value)} className={cn("relative px-2.5 py-3 text-[11px] font-medium text-muted-foreground", focusRing, tab === value && "text-foreground after:absolute after:inset-x-1 after:bottom-[-1px] after:h-px after:bg-primary")}>{label}</button>)}</div><OryonIconButton label="Mark all as read" size="sm" onClick={() => { setItems((current) => current.map((item) => item.archived ? item : { ...item, unread: false })); onMarkAllRead?.(); }}><CheckCircle2 className="h-4 w-4" /></OryonIconButton></div>
    <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight }}>
      <AnimatePresence initial={false} mode="popLayout">{shown.map((item) => <motion.div key={item.id} layout={!reduced} initial={reduced ? false : { opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }} transition={reduced ? { duration: 0 } : { duration: 0.2 }} className={cn("group border-b border-border/70 px-3.5 py-3.5 last:border-b-0", item.unread && "bg-primary/[0.025]")}>
          <div className="flex items-start gap-3"><div className="relative mt-0.5 h-8 w-8 shrink-0 overflow-hidden rounded-full border border-border bg-surface-1">{item.actor.avatar ? <img src={item.actor.avatar} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-muted-foreground">{item.actor.name.slice(0, 1)}</div>}<span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full border border-surface-2 bg-surface-3 text-primary">{notificationIcon[item.kind]}</span></div><button type="button" onClick={() => { if (item.unread) { patch(item.id, { unread: false }); onReadChange?.(item, false); } onOpenItem?.(item); }} className={cn("min-w-0 flex-1 text-left", focusRing)}><p className="text-[12.5px] leading-5 text-muted-foreground"><span className="font-semibold text-foreground">{item.actor.name}</span>{" "}{item.body.map((piece, index) => typeof piece === "string" ? <React.Fragment key={index}>{piece}</React.Fragment> : <span key={index} className="font-semibold text-foreground">{piece.entity}</span>)}{item.count && item.count > 1 ? <span className="ml-1 text-muted-foreground">×{item.count}</span> : null}</p><p className="mt-1 text-[10.5px] text-muted-foreground/70">{item.time}{item.context?.length ? ` · ${item.context.join(" · ")}` : ""}</p>{item.quote ? <p className="mt-2 rounded-[8px] border-l-2 border-primary/45 bg-surface-1 px-2.5 py-2 text-[11px] leading-4 text-muted-foreground">{item.quote}</p> : null}</button><OryonIconButton label="Notification actions" size="sm"><MoreHorizontal className="h-4 w-4" /></OryonIconButton></div>
          {resolved[item.id] ? <p className="ml-11 mt-2 text-[11px] font-medium text-primary">{resolved[item.id]}</p> : item.actions?.length ? <div className="ml-11 mt-2 flex flex-wrap gap-1.5">{item.actions.map((action) => <OryonButton key={action.id} variant={action.tone === "quiet" ? "outline" : "primary"} size="sm" onClick={() => { setResolved((r) => ({ ...r, [item.id]: action.resolved ?? action.label })); patch(item.id, { unread: false }); onAction?.(item, action.id); }}>{action.label}</OryonButton>)}</div> : null}
          <div className="ml-11 mt-2 hidden items-center gap-1 group-hover:flex group-focus-within:flex"><OryonButton variant="ghost" size="sm" onClick={() => { patch(item.id, { unread: !item.unread }); onReadChange?.(item, !item.unread); }}>{item.unread ? "Mark read" : "Mark unread"}</OryonButton><OryonButton variant="ghost" size="sm" onClick={() => { patch(item.id, { archived: !item.archived, unread: false }); onArchiveChange?.(item, !item.archived); }}>{item.archived ? "Restore" : "Archive"}</OryonButton></div>
        </motion.div>)}</AnimatePresence>
      {shown.length === 0 ? <OryonEmptyState icon={<Bell className="h-5 w-5" />} title={tab === "archived" ? "Nothing archived" : "You're all caught up"} description={tab === "archived" ? "Archived activity will land here." : "New activity will appear here."} /> : null}
    </div>
  </div>;
}

export function OryonAIResponse({ status = "ready", title = "Oryon Intelligence", answer, evidence, sources, confidence, nextStep }: { status?: "processing" | "ready" | "error"; title?: string; answer?: React.ReactNode; evidence?: React.ReactNode; sources?: React.ReactNode; confidence?: number; nextStep?: React.ReactNode }) {
  const processing = status === "processing";
  return <OryonPanel elevated className="relative overflow-hidden p-5">{processing ? <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" /> : null}<div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={cn("grid h-7 w-7 place-items-center rounded-[8px] border", processing ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-surface-1 text-primary")}>{processing ? <Sparkles className="h-3.5 w-3.5 animate-pulse" /> : <Sparkles className="h-3.5 w-3.5" />}</span><span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</span></div>{confidence != null ? <OryonBadge tone="accent">{Math.round(confidence * 100)}% confidence</OryonBadge> : null}</div>{processing ? <p className="mt-5 text-sm text-muted-foreground">Oryon is analysing the request…</p> : <div className="mt-5 space-y-4"><div><p className="text-label">Answer</p><div className="mt-1 text-[13px] leading-6 text-foreground">{answer}</div></div>{evidence ? <div><p className="text-label">Evidence</p><div className="mt-1 text-xs leading-5 text-muted-foreground">{evidence}</div></div> : null}{sources ? <div><p className="text-label">Sources</p><div className="mt-1 text-xs text-muted-foreground">{sources}</div></div> : null}{nextStep ? <div className="rounded-[8px] border border-primary/20 bg-primary/[0.05] p-3"><p className="text-label text-primary">Recommended next step</p><div className="mt-1 text-xs text-foreground">{nextStep}</div></div> : null}</div>}</OryonPanel>;
}

export function OryonRiskCard({ title, level, score, description, action }: { title: string; level: "low" | "medium" | "high" | "critical"; score?: number; description?: string; action?: React.ReactNode }) {
  const danger = level === "critical" || level === "high";
  const warning = level === "medium";
  return <OryonCard className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[13px] font-semibold text-foreground">{title}</p>{description ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p> : null}</div><OryonBadge tone={danger ? "danger" : warning ? "warning" : "accent"}>{level}</OryonBadge></div>{score != null ? <div className="mt-4"><div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>Risk score</span><span className="font-semibold text-foreground">{score}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className={cn("h-full rounded-full", danger ? "bg-[hsl(var(--status-danger))]" : warning ? "bg-[hsl(var(--status-warning))]" : "bg-primary")} style={{ width: `${Math.min(100, Math.max(0, score))}%` }} /></div></div> : null}{action ? <div className="mt-4">{action}</div> : null}</OryonCard>;
}

export function GradientWaveText({ children, className, paused = false }: { children: React.ReactNode; className?: string; paused?: boolean }) {
  return <span className={cn("oryon-gradient-wave-text", paused && "[animation-play-state:paused]", className)}>{children}</span>;
}

export function SlideUpText({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  return <motion.span initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={reduced ? { duration: 0 } : { duration: 0.24, ease: "easeOut" }} className={cn("inline-block", className)}>{children}</motion.span>;
}

export function ShimmerText({ children, className }: { children: React.ReactNode; className?: string }) { return <span className={cn("oryon-shimmer-text", className)}>{children}</span>; }

export function BorderBeam({ children, className, active = true }: { children: React.ReactNode; className?: string; active?: boolean }) {
  return <div className={cn("oryon-border-beam relative rounded-[12px] p-px", !active && "oryon-border-beam-static", className)}><div className="relative rounded-[11px] bg-surface-2">{children}</div></div>;
}

export const OryonUI = {
  OryonButton,
  OryonIconButton,
  OryonInput,
  OryonSelect,
  OryonSwitch,
  OryonBadge,
  OryonStatus,
  OryonCard,
  OryonPanel,
  OryonDialog,
  OryonSheet,
  OryonPopover,
  OryonCommand,
  OryonTabs,
  OryonTabsList,
  OryonTabsTrigger,
  OryonTabsContent,
  OryonTable,
  OryonDataGrid,
  OryonTimeline,
  OryonActivity,
  OryonEntityHeader,
  OryonInspector,
  OryonEmptyState,
  OryonSkeleton,
  OryonToast,
  OryonNotificationPanel,
  OryonPinnedList,
  OryonAIResponse,
  OryonRiskCard,
  GradientWaveText,
  SlideUpText,
  ShimmerText,
  BorderBeam,
};

export default OryonUI;
