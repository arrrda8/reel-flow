"use client";

import { useEffect, useRef } from "react";
import type { ProjectEvent } from "@/lib/events";

export function useProjectEvents(
  projectId: string | null,
  onEvent: (event: ProjectEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!projectId) return;

    const eventSource = new EventSource(`/api/events/${projectId}`);

    eventSource.onmessage = (e) => {
      try {
        const event: ProjectEvent = JSON.parse(e.data);
        onEventRef.current(event);
      } catch {
        // Ignore non-JSON messages (e.g. keepalive comments)
      }
    };

    eventSource.onerror = () => {
      // EventSource will automatically attempt to reconnect
      console.warn("[useProjectEvents] Connection error, reconnecting...");
    };

    return () => {
      eventSource.close();
    };
  }, [projectId]);
}
