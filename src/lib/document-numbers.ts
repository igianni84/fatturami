/**
 * Shared document number generation for invoices, quotes, and credit notes.
 * Pattern: PREFIX-YEAR-NNN (e.g. FTT-2026-001)
 */

/**
 * Generate the next sequential document number.
 * @param prefix - Document prefix (e.g. "FTT", "PREV", "NC")
 * @param findLast - Callback to find the last document with the given prefix
 */
export async function generateDocumentNumber(
  prefix: string,
  findLast: (fullPrefix: string) => Promise<{ number: string } | null>
): Promise<string> {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}-`;

  const last = await findLast(fullPrefix);

  let nextNum = 1;
  if (last) {
    const lastNum = parseInt(last.number.split("-")[2], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  return `${fullPrefix}${String(nextNum).padStart(3, "0")}`;
}
