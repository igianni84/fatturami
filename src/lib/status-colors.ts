/**
 * Unified status badge color classes across all modules.
 * Maps semantic status concepts to consistent color schemes.
 */

const STATUS_COLORS: Record<string, string> = {
  // Draft/initial state — gray
  bozza: "border-gray-300 bg-gray-100 text-gray-800",

  // Active/issued/sent — blue
  emessa: "border-blue-300 bg-blue-100 text-blue-800",
  inviata: "border-blue-300 bg-blue-100 text-blue-800",
  inviato: "border-blue-300 bg-blue-100 text-blue-800",
  registrata: "border-blue-300 bg-blue-100 text-blue-800",

  // Partial payment — orange
  parzialmente_pagata: "border-orange-300 bg-orange-100 text-orange-800",

  // Positive completion — green
  pagata: "border-green-300 bg-green-100 text-green-800",
  accettato: "border-green-300 bg-green-100 text-green-800",

  // Negative/expired — red
  scaduta: "border-red-300 bg-red-100 text-red-800",
  scaduto: "border-red-300 bg-red-100 text-red-800",
  rifiutato: "border-red-300 bg-red-100 text-red-800",

  // Converted/transformed — purple
  convertito: "border-purple-300 bg-purple-100 text-purple-800",
};

const DEFAULT_COLOR = "border-gray-300 bg-gray-100 text-gray-800";

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || DEFAULT_COLOR;
}
