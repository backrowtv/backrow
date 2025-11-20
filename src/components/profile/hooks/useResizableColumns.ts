import { useState, useCallback, useRef } from "react";

interface ColumnDef {
  key: string;
  minWidth: number;
  defaultWidth: number;
}

export function useResizableColumns(columns: ColumnDef[]) {
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(columns.map((c) => [c.key, c.defaultWidth]))
  );
  const dragRef = useRef<{
    key: string;
    startX: number;
    startWidth: number;
    minWidth: number;
  } | null>(null);

  const onMouseDown = useCallback(
    (key: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const col = columns.find((c) => c.key === key);
      if (!col) return;

      dragRef.current = {
        key,
        startX: e.clientX,
        startWidth: widths[key] ?? col.defaultWidth,
        minWidth: col.minWidth,
      };

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const delta = ev.clientX - dragRef.current.startX;
        const newWidth = Math.max(dragRef.current.minWidth, dragRef.current.startWidth + delta);
        setWidths((prev) => ({ ...prev, [dragRef.current!.key]: newWidth }));
      };

      const onMouseUp = () => {
        dragRef.current = null;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [columns, widths]
  );

  return { widths, onMouseDown };
}
