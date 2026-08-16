/**
 * All money in this app is an integer number of poisha (1 BDT = 100 poisha).
 *
 * Floating point taka would drift on percentage discounts and split delivery
 * fees, and a grocery bill that is one poisha off is a bill the shop owner
 * stops trusting. Convert at the edges (admin input, display) only.
 */

export const POISHA_PER_TAKA = 100;

/** Admin input ("75", "12.50") → poisha. Returns null for junk input. */
export function takaToPoisha(input: string | number): number | null {
  const raw = typeof input === 'number' ? String(input) : input.trim();
  if (raw === '') return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw)) return null;
  const value = Math.round(Number(raw) * POISHA_PER_TAKA);
  return Number.isFinite(value) ? value : null;
}

/** Poisha → taka as a plain number, for form fields and structured data. */
export function poishaToTaka(poisha: number): number {
  return poisha / POISHA_PER_TAKA;
}

/**
 * Bangladesh follows the South Asian grouping convention, so one lakh taka
 * reads ৳1,00,000 rather than ৳100,000. `en-IN` produces exactly that.
 */
const groupingFormatter = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Poisha → "৳1,240" (or "৳12.50" when there really are poisha). */
export function formatBDT(poisha: number): string {
  const taka = poishaToTaka(Math.round(poisha));
  return `৳${groupingFormatter.format(taka)}`;
}

/** Same as formatBDT but without the symbol, for inputs and tables. */
export function formatAmount(poisha: number): string {
  return groupingFormatter.format(poishaToTaka(Math.round(poisha)));
}

/** The price the customer actually pays: discount price when it is lower. */
export function effectivePricePoisha(product: {
  pricePoisha: number;
  discountPricePoisha?: number | null;
}): number {
  const { pricePoisha, discountPricePoisha } = product;
  if (discountPricePoisha != null && discountPricePoisha > 0 && discountPricePoisha < pricePoisha) {
    return discountPricePoisha;
  }
  return pricePoisha;
}

/** Whole-percent saving, for the "-12%" badge. Zero when there is no discount. */
export function discountPercent(product: {
  pricePoisha: number;
  discountPricePoisha?: number | null;
}): number {
  const effective = effectivePricePoisha(product);
  if (effective >= product.pricePoisha || product.pricePoisha <= 0) return 0;
  return Math.round(((product.pricePoisha - effective) / product.pricePoisha) * 100);
}
