import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Icon, type IconName } from "./Icon";

export type MenuItem = {
  /** Visible text: includes the cost where a press uses allowance. */
  label: string;
  /** Accessible name when it should say more than the visible text. */
  ariaLabel?: string;
  disabled?: boolean;
  onSelect: () => void;
};

/**
 * An icon button that opens a small menu (WAI-ARIA menu button): focus moves to the first item,
 * arrows, Home and End move between items, Escape closes and returns focus to the button, Tab or
 * a click outside closes it. The list is placed by CSS (.action-menu-list).
 */
export function MenuButton({
  label,
  title,
  icon,
  items,
  disabled,
}: {
  label: string;
  /** Tooltip when it should say more than the label (why it is unavailable). */
  title?: string;
  icon: IconName;
  items: MenuItem[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState<false | "first" | "last">(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const id = useId();
  // A request started elsewhere disables the button: its menu closes too.
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  const entries = () => [...(list.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not(:disabled)") ?? [])];
  useEffect(() => {
    if (!open) return;
    const all = entries();
    (open === "last" ? all.at(-1) : all[0])?.focus();
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!list.current?.contains(target) && !trigger.current?.contains(target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const onListKey = (event: KeyboardEvent) => {
    const all = entries();
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    const move = (index: number) => {
      event.preventDefault();
      all[(index + all.length) % all.length]?.focus();
    };
    if (event.key === "ArrowDown") move(at + 1);
    else if (event.key === "ArrowUp") move(at - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(all.length - 1);
    else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") setOpen(false);
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="icon-action"
        aria-label={label}
        title={title ?? label}
        aria-haspopup="menu"
        aria-expanded={!!open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={() => setOpen(open ? false : "first")}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(event.key === "ArrowUp" ? "last" : "first");
          }
        }}
      >
        <Icon name={icon} />
      </button>
      {open && (
        <div ref={list} id={id} role="menu" aria-label={label} className="action-menu-list" onKeyDown={onListKey}>
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              aria-label={item.ariaLabel}
              disabled={item.disabled}
              onClick={() => {
                close();
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}
