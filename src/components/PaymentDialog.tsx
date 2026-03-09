"use client";

import { useState, useEffect } from "react";
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

const STORAGE_KEY = "lastPaymentMethod";

function getLastPaymentMethod(): string {
  if (typeof window === "undefined") return "bonifico";
  return localStorage.getItem(STORAGE_KEY) || "bonifico";
}

function saveLastPaymentMethod(method: string) {
  if (typeof window !== "undefined" && method) {
    localStorage.setItem(STORAGE_KEY, method);
  }
}

function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "EUR" ? "\u20ac" : currency === "GBP" ? "\u00a3" : "$";
  return `${symbol} ${amount.toLocaleString("it-IT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function roundTwo(n: number): number {
  return Math.round(n * 100) / 100;
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

  useEffect(() => {
    if (open) {
      setAmount(String(roundTwo(remaining)));
      setDate(new Date().toISOString().split("T")[0]);
      setMethod(getLastPaymentMethod());
      setNotes("");
    }
  }, [open, remaining]);

  const parsedAmount = parseFloat(amount);
  const isValid =
    !isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= remaining + 0.01 &&
    date.length > 0;

  const fractions = [
    { label: "¼", factor: 0.25 },
    { label: "½", factor: 0.5 },
    { label: "¾", factor: 0.75 },
    { label: "Tutto", factor: 1 },
  ];

  const handleConfirm = () => {
    saveLastPaymentMethod(method);
    onConfirm({ amount: parsedAmount, date, method, notes });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            <div className="flex gap-2 mt-2">
              {fractions.map((f) => {
                const val = roundTwo(remaining * f.factor);
                const isActive = parsedAmount === val;
                return (
                  <Button
                    key={f.label}
                    type="button"
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setAmount(String(val))}
                  >
                    {f.label}
                    <span className="hidden sm:inline ml-1 text-[10px] opacity-70">
                      {formatCurrency(val, currency)}
                    </span>
                  </Button>
                );
              })}
            </div>
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
            onClick={handleConfirm}
            disabled={loading || !isValid}
          >
            {loading ? "Attendere..." : "Conferma"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
