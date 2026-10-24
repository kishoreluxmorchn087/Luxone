import { ChevronRight, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

  const handleActionClick = (actionKey: string) => {
    onClickAction(actionKey);
    onClose();
  };

  return (
    <div className="absolute left-full top-0 z-[70] ml-1 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
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
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [menuWidth, setMenuWidth] = useState(176);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (ref.current?.contains(target)) return;

      const menu = document.getElementById("crm-row-more-options-portal");

      if (menu?.contains(target)) return;

      setOpen(false);
      setOpenNested(null);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const handleClose = () => {
    setOpen(false);
    setOpenNested(null);
  };

  const handleActionClick = (actionKey: string) => {
    onClickAction(actionKey);
    handleClose();
  };

  const handleToggle = () => {
    alert("More options button clicked!");
  if (!open && ref.current) {
    const rect = ref.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const estimatedMenuHeight = Math.min(260, viewportHeight - 16);
    const estimatedMenuWidth = 176;

    const shouldOpenUp =
      viewportHeight - rect.bottom < estimatedMenuHeight + 8;

    const calculatedTop = shouldOpenUp
      ? rect.top - estimatedMenuHeight - 4
      : rect.bottom + 4;

    setMenuPosition({
      top: Math.max(
        8,
        Math.min(calculatedTop, viewportHeight - estimatedMenuHeight - 8)
      ),
      left: Math.max(
        8,
        Math.min(rect.left, viewportWidth - estimatedMenuWidth - 8)
      ),
    });

    setMenuWidth(estimatedMenuWidth);
  }

  setOpen((prev) => !prev);
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

            {open
        ? createPortal(
            <div
              id="crm-row-more-options-portal"
              style={{
                position: "fixed",
                top: menuPosition.top,
                left: menuPosition.left,
                width: menuWidth,
                zIndex: 9999,
              }}
              className="rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
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
