"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PaymentDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (paidAt: string) => void;
  loading?: boolean;
  invoiceNumber?: string;
}

export function PaymentDateDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  invoiceNumber,
}: PaymentDateDialogProps) {
  const [paidAt, setPaidAt] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen) {
          setPaidAt(new Date().toISOString().split("T")[0]);
        }
        onOpenChange(isOpen);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Segna come pagata</DialogTitle>
          <DialogDescription>
            {invoiceNumber
              ? `Inserisci la data di pagamento per la fattura ${invoiceNumber}.`
              : "Inserisci la data di pagamento."}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="paidAt">Data di pagamento</Label>
          <Input
            id="paidAt"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="mt-1.5"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annulla
          </Button>
          <Button onClick={() => onConfirm(paidAt)} disabled={loading || !paidAt}>
            {loading ? "Attendere..." : "Conferma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
