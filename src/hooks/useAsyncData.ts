import { useEffect, useRef, useState } from "react";
import type { AsyncState } from "../types";

/**
 * Runs a producer function (typically wrapping a mock/real service call) and
 * exposes loading / error / success states so pages can render the full set
 * of realistic states rather than only the happy path.
 */
export function useAsyncData<T>(
  producer: () => Promise<T>,
  deps: unknown[],
  isEmpty?: (data: T) => boolean
): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading" });
  const attempt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    producer()
      .then((data) => {
        if (cancelled) return;
        if (isEmpty?.(data)) {
          setState({ status: "empty" });
        } else {
          setState({ status: "success", data });
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setState({ status: "error", message: err.message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt.current]);

  return { ...state, retry: () => (attempt.current += 1) } as AsyncState<T> & { retry: () => void };
}
