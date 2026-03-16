"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FileAttachmentViewProps {
  entityId: string;
  filePath: string;
  getFileUrl: (id: string) => Promise<string | null>;
}

export function FileAttachmentView({
  entityId,
  filePath,
  getFileUrl,
}: FileAttachmentViewProps) {
  const [loading, setLoading] = useState(false);

  const isLegacy = filePath.startsWith("uploads/");
  const fileName = filePath.split("/").pop() || "file";

  const handleOpen = async () => {
    setLoading(true);
    try {
      const url = await getFileUrl(entityId);
      if (url) {
        window.open(url, "_blank");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground truncate max-w-xs">
        {fileName}
      </span>
      {isLegacy ? (
        <span className="text-xs text-muted-foreground italic">
          File archiviato localmente
        </span>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          disabled={loading}
        >
          {loading ? "Caricamento..." : "Apri allegato"}
        </Button>
      )}
    </div>
  );
}
