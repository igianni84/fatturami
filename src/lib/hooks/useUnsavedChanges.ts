"use client";

import { useEffect, useRef } from "react";

/**
 * Mostra un warning del browser quando l'utente tenta di chiudere/ricaricare
 * la pagina con modifiche non salvate.
 *
 * @param isDirty - true quando il form ha modifiche non ancora salvate
 */
export function useUnsavedChanges(isDirty: boolean) {
  const dirtyRef = useRef(isDirty);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
      }
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);
}
