import { ChevronRight, ListTodo, NotebookPen } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type CRMRowUtilityIconsProps = {
  showNotes?: boolean;
  showActivity?: boolean;
  onOpenNotes?: () => void;
  onOpenActivityAction?: (actionKey: string) => void;
};

export default function CRMRowUtilityIcons({
  showNotes = true,
  showActivity = true,
  onOpenNotes,
  onOpenActivityAction,
}: CRMRowUtilityIconsProps) {
  const [open, setOpen] = useState(false);
  const [openCallSubmenu, setOpenCallSubmenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [submenuPosition, setSubmenuPosition] = useState({
    top: 0,
    left: 0,
  });

  const menuRef = useRef<HTMLDivElement | null>(null);
  const activityButtonRef = useRef<HTMLButtonElement | null>(null);
  const callButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (menuRef.current?.contains(target)) return;

      const menu = document.getElementById("crm-row-activity-portal");
      const submenu = document.getElementById("crm-row-call-submenu-portal");

      if (menu?.contains(target) || submenu?.contains(target)) return;

      setOpen(false);
      setOpenCallSubmenu(false);
    };

    document.addEventListener("mousedown", onOutside);

    return () => {
      document.removeEventListener("mousedown", onOutside);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const repositionMenu = () => {
      const button = activityButtonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const menuWidth = 176;
      const menuHeight = 148;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const left = Math.max(
        8,
        Math.min(rect.left, viewportWidth - menuWidth - 8)
      );

      const spaceBelow = viewportHeight - rect.bottom;
      const top =
        spaceBelow >= menuHeight + 8
          ? rect.bottom + 4
          : Math.max(8, rect.top - menuHeight - 4);

      setMenuPosition({ top, left });
    };

    repositionMenu();

    window.addEventListener("resize", repositionMenu);
    window.addEventListener("scroll", repositionMenu, true);

    return () => {
      window.removeEventListener("resize", repositionMenu);
      window.removeEventListener("scroll", repositionMenu, true);
    };
  }, [open]);

  useEffect(() => {
    if (!openCallSubmenu) return;

    const repositionSubmenu = () => {
      const button = callButtonRef.current;
      if (!button) return;

      const rect = button.getBoundingClientRect();
      const submenuWidth = 176;
      const submenuHeight = 88;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const openRight = rect.right + submenuWidth + 8 <= viewportWidth;

      const left = openRight
        ? rect.right + 4
        : Math.max(8, rect.left - submenuWidth - 4);

      const top = Math.max(
        8,
        Math.min(rect.top, viewportHeight - submenuHeight - 8)
      );

      setSubmenuPosition({ top, left });
    };

    repositionSubmenu();

    window.addEventListener("resize", repositionSubmenu);
    window.addEventListener("scroll", repositionSubmenu, true);

    return () => {
      window.removeEventListener("resize", repositionSubmenu);
      window.removeEventListener("scroll", repositionSubmenu, true);
    };
  }, [openCallSubmenu]);

  const handleActivityToggle = () => {
    if (!open && activityButtonRef.current) {
      const rect = activityButtonRef.current.getBoundingClientRect();
      const menuWidth = 176;
      const menuHeight = 148;

      const left = Math.max(
        8,
        Math.min(rect.left, window.innerWidth - menuWidth - 8)
      );

      const top =
        window.innerHeight - rect.bottom >= menuHeight + 8
          ? rect.bottom + 4
          : Math.max(8, rect.top - menuHeight - 4);

      setMenuPosition({ top, left });
    }

    setOpen((previous) => !previous);
    setOpenCallSubmenu(false);
  };

  const handleActivityAction = (actionKey: string) => {
    onOpenActivityAction?.(actionKey);
    setOpen(false);
    setOpenCallSubmenu(false);
  };

  return (
    <>
      {showNotes ? (
        <button
          type="button"
          onClick={onOpenNotes}
          className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
          aria-label="Open notes"
        >
          <NotebookPen size={15} />
        </button>
      ) : null}

      {showActivity ? (
        <div
          ref={menuRef}
          className="relative"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            ref={activityButtonRef}
            type="button"
            onClick={handleActivityToggle}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="Open activity"
          >
            <ListTodo size={15} />
          </button>

          {open
            ? createPortal(
                <div
                  id="crm-row-activity-portal"
                  style={{
                    position: "fixed",
                    top: menuPosition.top,
                    left: menuPosition.left,
                    width: 176,
                    zIndex: 9999,
                  }}
                  className="rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleActivityAction("create-task")}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Create Task
                  </button>

                  <button
                    type="button"
                    onClick={() => handleActivityAction("create-meeting")}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Create Meeting
                  </button>

                  <button
                    ref={callButtonRef}
                    type="button"
                    onClick={() =>
                      setOpenCallSubmenu((previous) => !previous)
                    }
                    className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <span>Create Call</span>
                    <ChevronRight
                      size={14}
                      className={openCallSubmenu ? "rotate-90" : ""}
                    />
                  </button>
                </div>,
                document.body
              )
            : null}

          {open && openCallSubmenu
            ? createPortal(
                <div
                  id="crm-row-call-submenu-portal"
                  style={{
                    position: "fixed",
                    top: submenuPosition.top,
                    left: submenuPosition.left,
                    width: 176,
                    zIndex: 10000,
                  }}
                  className="rounded-lg border border-slate-200 bg-white p-1 shadow-lg"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => handleActivityAction("schedule-call")}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Schedule a call
                  </button>

                  <button
                    type="button"
                    onClick={() => handleActivityAction("log-call")}
                    className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Log a call
                  </button>
                </div>,
                document.body
              )
            : null}
        </div>
      ) : null}
    </>
  );
}