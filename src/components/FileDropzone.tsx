"use client";

import { useState, useRef, useCallback } from "react";

interface FileDropzoneProps {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  children?: React.ReactNode;
}

export function FileDropzone({
  accept,
  multiple = false,
  disabled = false,
  onFiles,
  children,
}: FileDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const acceptedTypes = accept
    ? accept.split(",").map((t) => t.trim().toLowerCase())
    : null;

  function isFileAccepted(file: File): boolean {
    if (!acceptedTypes) return true;
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    return acceptedTypes.some(
      (t) => t === file.type || t === ext
    );
  }

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      dragCounter.current++;
      if (e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        e.dataTransfer.dropEffect = "copy";
      }
    },
    [disabled]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files).filter(isFileAccepted);
      if (droppedFiles.length === 0) return;

      if (multiple) {
        onFiles(droppedFiles);
      } else {
        onFiles([droppedFiles[0]]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [disabled, multiple, onFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files;
      if (!selected || selected.length === 0) return;
      onFiles(Array.from(selected));
      // Reset input so same file can be re-selected
      e.target.value = "";
    },
    [onFiles]
  );

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors
        ${disabled ? "cursor-not-allowed opacity-50" : "hover:border-primary/50 hover:bg-muted/50"}
        ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
        className="hidden"
      />
      {children || (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            {isDragging
              ? "Rilascia il file qui"
              : "Trascina un file qui o clicca per selezionare"}
          </p>
          {accept && (
            <p className="text-xs text-muted-foreground/70">
              Formati supportati: {accept}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
