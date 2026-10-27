import { ChevronRight, MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CRMRowAction } from "../../lib/shared/crmTypes";

type CRMRowMoreOptionsMenuProps = {
  actions: CRMRowAction[];
  onClickAction: (key: string) => void;
};

type SubMenuProps = {
  actions: CRMRowAction[];
  onClickAction: (key: string) => void;
  onClose: () => void;
};

function ActionSubMenu({ actions, onClickAction, onClose }: SubMenuProps) {
  const [openNested, setOpenNested] = useState<string | null>(null);
  const subMenuRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<{ h: "left" | "right"; v: "top" | "bottom" }>({
    h: "right",
    v: "top",
  });

  useLayoutEffect(() => {
    if (!subMenuRef.current) return;
    const rect = subMenuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    setPlacement({
      h: rect.right > viewportWidth - 8 ? "left" : "right",
      v: rect.bottom > viewportHeight - 8 ? "bottom" : "top",
    });
  }, []);

  const handleActionClick = (actionKey: string) => {
    onClickAction(actionKey);
    onClose();
  };

  const positionClasses = [
    placement.h === "right" ? "left-full ml-1" : "right-full mr-1",
    placement.v === "top" ? "top-0" : "bottom-0",
  ].join(" ");

  return (
    <div
      ref={subMenuRef}
      className={`absolute z-[70] w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg ${positionClasses}`}
    >
      {actions.map((action) =>
        action.children?.length ? (
          <div key={action.key} className="relative">
            <button
              type="button"
              onMouseEnter={() => setOpenNested(action.key)}
              onClick={() => setOpenNested((prev) => (prev === action.key ? null : action.key))}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <span>{action.label}</span>
              <ChevronRight size={14} className={openNested === action.key ? "rotate-90" : ""} />
            </button>
            {openNested === action.key && (
              <ActionSubMenu actions={action.children} onClickAction={onClickAction} onClose={onClose} />
            )}
          </div>
        ) : (
          <button
            key={action.key}
            type="button"
            onClick={() => handleActionClick(action.key)}
            className={`block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50 ${
              action.destructive ? "text-rose-600" : "text-slate-700"
            }`}
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

export default function CRMRowMoreOptionsMenu({ actions, onClickAction }: CRMRowMoreOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [openNested, setOpenNested] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ left: number; top: number } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const updateMenuPosition = useCallback((menuHeight: number) => {
    const anchor = ref.current?.getBoundingClientRect();
    if (!anchor) return;

    const viewportMargin = 8;
    const menuWidth = 176;
    const gap = 4;
    const viewportHeight = window.innerHeight;
    const viewportWidth = document.documentElement.clientWidth;
    const left = Math.min(
      Math.max(anchor.left, viewportMargin),
      Math.max(viewportMargin, viewportWidth - menuWidth - viewportMargin)
    );
    const fitsBelow = anchor.bottom + gap + menuHeight <= viewportHeight - viewportMargin;
    const fitsAbove = anchor.top - gap - menuHeight >= viewportMargin;
    const top = fitsBelow
      ? anchor.bottom + gap
      : fitsAbove
        ? anchor.top - gap - menuHeight
        : Math.min(
            Math.max(anchor.bottom + gap, viewportMargin),
            Math.max(viewportMargin, viewportHeight - menuHeight - viewportMargin)
          );

    setMenuPosition({ left, top });
  }, []);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!ref.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
        setOpenNested(null);
        setMenuPosition(null);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    updateMenuPosition(menuRef.current.getBoundingClientRect().height);
  }, [open, actions.length, updateMenuPosition]);

  useEffect(() => {
    if (!open) return;

    const reposition = () => {
      if (menuRef.current) updateMenuPosition(menuRef.current.getBoundingClientRect().height);
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, updateMenuPosition]);

  const handleClose = () => {
    setOpen(false);
    setOpenNested(null);
    setMenuPosition(null);
  };

  const handleActionClick = (actionKey: string) => {
    onClickAction(actionKey);
    handleClose();
  };

  const handleToggle = () => {
    if (open) {
      handleClose();
    } else {
      updateMenuPosition(Math.min(actions.length * 36 + 10, window.innerHeight - 16));
      setOpen(true);
    }
  };

  return (
    <div ref={ref} className="relative" onClick={(event) => event.stopPropagation()}>
      <button
        type="button"
        onClick={handleToggle}
        className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && menuPosition
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[60] w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
              style={{
                left: menuPosition.left,
                top: menuPosition.top,
              }}
            >
              {actions.map((action) =>
                action.children?.length ? (
                  <div key={action.key} className="relative">
                    <button
                      type="button"
                      onMouseEnter={() => setOpenNested(action.key)}
                      onClick={() => setOpenNested((prev) => (prev === action.key ? null : action.key))}
                      className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span>{action.label}</span>
                      <ChevronRight size={14} className={openNested === action.key ? "rotate-90" : ""} />
                    </button>
                    {openNested === action.key ? (
                      <ActionSubMenu actions={action.children} onClickAction={handleActionClick} onClose={handleClose} />
                    ) : null}
                  </div>
                ) : (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => handleActionClick(action.key)}
                    className={`block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                      action.destructive ? "text-rose-600" : "text-slate-700"
                    }`}
                  >
                    {action.label}
                  </button>
                )
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
