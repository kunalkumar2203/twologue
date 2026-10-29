import * as React from "react";

type SaveState = "idle" | "saving" | "saved" | "error";

// Saves after a short pause in typing. Also saves when the field loses focus or the screen closes.
export function useAutosave(save: (value: string) => Promise<unknown>, delay = 800) {
  const [state, setState] = React.useState<SaveState>("idle");
  const saveRef = React.useRef(save);
  const timer = React.useRef<number | undefined>(undefined);
  const pending = React.useRef<string | null>(null);

  React.useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const flush = React.useCallback(async () => {
    window.clearTimeout(timer.current);
    const value = pending.current;
    if (value === null) return;
    pending.current = null;
    setState("saving");
    try {
      await saveRef.current(value);
      setState("saved");
    } catch {
      // Keep the text so the next save can try again
      if (pending.current === null) pending.current = value;
      setState("error");
    }
  }, []);

  const queue = React.useCallback(
    (value: string) => {
      pending.current = value;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), delay);
    },
    [delay, flush],
  );

  React.useEffect(() => {
    return () => {
      window.clearTimeout(timer.current);
      void flush();
    };
  }, [flush]);

  return { queue, flush, state };
}