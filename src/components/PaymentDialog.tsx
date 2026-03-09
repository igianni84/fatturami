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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    amount: number;
    date: string;
    method: string;
    notes: string;
  }) => void;
  loading?: boolean;
  invoiceNumber?: string;
  invoiceTotal: number;
  totalPaid: number;
  currency: string;
}

const PAYMENT_METHODS = [
  { value: "bonifico", label: "Bonifico" },
  { value: "contanti", label: "Contanti" },
  { value: "assegno", label: "Assegno" },
  { value: "carta", label: "Carta" },
  { value: "altro", label: "Altro" },
];

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "EUR" ? "\u20ac" : currency === "GBP" ? "\u00a3" : "$";
  return `${symbol} ${amount.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function PaymentDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  invoiceNumber,
  invoiceTotal,
  totalPaid,
  currency,
}: PaymentDialogProps) {
  const remaining = invoiceTotal - totalPaid;

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");

  const resetForm = () => {
    setAmount(String(Math.round(remaining * 100) / 100));
    setDate(new Date().toISOString().split("T")[0]);
    setMethod("");
    setNotes("");
  };

  const parsedAmount = parseFloat(amount);
  const isValid =
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= remaining + 0.01 &&
    date.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Registra pagamento</DialogTitle>
          <DialogDescription>
            {invoiceNumber
              ? `Registra un pagamento per la fattura ${invoiceNumber}.`
              : "Registra un pagamento."}
            {" "}Saldo rimanente: {formatCurrency(remaining, currency)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="payment-amount">Importo</Label>
            <Input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={remaining + 0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="payment-date">Data</Label>
            <Input
              id="payment-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="payment-method">Metodo di pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="payment-method" className="mt-1.5">
                <SelectValue placeholder="Seleziona metodo..." />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="payment-notes">Note</Label>
            <Textarea
              id="payment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note opzionali..."
              rows={2}
              className="mt-1.5"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Annulla
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                amount: parsedAmount,
                date,
                method,
                notes,
              })
            }
            disabled={loading || !isValid}
          >
            {loading ? "Attendere..." : "Conferma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
