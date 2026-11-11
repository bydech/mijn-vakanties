// utils/formatters.ts

/**
 * Formatteert een bedrag naar een valuta-string (standaard EUR in nl-NL)
 * Voorbeeld: 12.5 -> "€ 12,50"
 */
export function formatCurrency(amount: number | null | undefined, currency = "EUR"): string {
  const val = Number(amount || 0);
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency || "EUR",
  }).format(val);
}

/**
 * Formatteert een datumbereik netjes in het Nederlands
 * Voorbeeld: ("2026-08-10", "2026-08-20") -> "10 – 20 aug 2026"
 */
export function formatDateRange(start?: string | null, end?: string | null): string {
  if (!start) return "Datum n.t.b.";

  const startDate = new Date(start);
  if (!end) {
    return new Intl.DateTimeFormat("nl-NL", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(startDate);
  }

  const endDate = new Date(end);

  const formatter = new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  try {
    return formatter.formatRange(startDate, endDate);
  } catch {
    const s = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short" }).format(startDate);
    const e = formatter.format(endDate);
    return `${s} – ${e}`;
  }
}

/**
 * Formatteert een enkele datum kort
 * Voorbeeld: "2026-08-10" -> "10 aug 2026"
 */
export function formatDate(date?: string | Date | null): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return String(date);
  return new Intl.DateTimeFormat("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Formatteert een datum naar een header-dagtekst (bijv. voor groeperingen van uitgaven)
 * Voorbeeld: "2026-08-10" -> "maandag 10 augustus"
 */
export function formatDayHeader(dateStr?: string | Date | null): string {
  if (!dateStr || dateStr === "Onbekend") return "Onbekende datum";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
}
