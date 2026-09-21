const UNIT_VISUALS = [
  {
    name: "Tosca",
    cardClass: "border-teal/25 bg-teal/10",
    badgeClass: "border-teal/25 bg-teal-50 text-teal-800",
    dotClass: "bg-teal-500",
    textClass: "text-teal-100"
  },
  {
    name: "Biru",
    cardClass: "border-sky-300/25 bg-sky-400/10",
    badgeClass: "border-sky-300/30 bg-sky-50 text-sky-800",
    dotClass: "bg-sky-500",
    textClass: "text-sky-100"
  },
  {
    name: "Emas",
    cardClass: "border-amber-300/25 bg-amber-400/10",
    badgeClass: "border-amber-300/40 bg-amber-50 text-amber-800",
    dotClass: "bg-amber-400",
    textClass: "text-amber-100"
  },
  {
    name: "Rose",
    cardClass: "border-rose-300/25 bg-rose-400/10",
    badgeClass: "border-rose-300/35 bg-rose-50 text-rose-800",
    dotClass: "bg-rose-500",
    textClass: "text-rose-100"
  },
  {
    name: "Indigo",
    cardClass: "border-indigo-300/25 bg-indigo-400/10",
    badgeClass: "border-indigo-300/35 bg-indigo-50 text-indigo-800",
    dotClass: "bg-indigo-500",
    textClass: "text-indigo-100"
  },
  {
    name: "Lime",
    cardClass: "border-lime-300/25 bg-lime-400/10",
    badgeClass: "border-lime-300/40 bg-lime-50 text-lime-800",
    dotClass: "bg-lime-500",
    textClass: "text-lime-100"
  }
] as const;

function hashText(value: string) {
  return Array.from(value.trim().toLowerCase()).reduce((total, char) => total + char.charCodeAt(0), 0);
}

export function getUnitVisual(unitName?: string | null) {
  const normalized = unitName?.trim() || "Unit belum diisi";
  const visual = UNIT_VISUALS[hashText(normalized) % UNIT_VISUALS.length];

  return {
    ...visual,
    unitName: normalized,
    label: visual.name
  };
}

function daysUntil(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const today = new Date();
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((date.getTime() - todayOnly.getTime()) / 86_400_000);
}

export function getExpiryStatus(expiryDate?: string | null) {
  if (!expiryDate) {
    return {
      tone: "unknown",
      label: "ED belum diisi",
      detail: "Tanggal kedaluwarsa belum tersedia",
      badgeClass: "border-slate-300/30 bg-slate-100 text-slate-700",
      cardClass: "border-slate-300/20 bg-slate-400/10",
      dotClass: "bg-slate-400"
    } as const;
  }

  const days = daysUntil(expiryDate);
  if (days === null) {
    return {
      tone: "unknown",
      label: "Format ED belum valid",
      detail: expiryDate,
      badgeClass: "border-slate-300/30 bg-slate-100 text-slate-700",
      cardClass: "border-slate-300/20 bg-slate-400/10",
      dotClass: "bg-slate-400"
    } as const;
  }

  if (days < 0) {
    return {
      tone: "expired",
      label: `ED lewat ${Math.abs(days)} hari`,
      detail: "Jangan distribusikan. Segera karantina/review.",
      badgeClass: "border-rose-400/40 bg-rose-50 text-rose-800",
      cardClass: "border-rose-400/35 bg-rose-500/10",
      dotClass: "bg-rose-500"
    } as const;
  }

  if (days <= 30) {
    return {
      tone: "critical",
      label: days === 0 ? "ED hari ini" : `ED kritis ${days} hari`,
      detail: "Prioritas FEFO tertinggi. Review sebelum keluar.",
      badgeClass: "border-rose-400/40 bg-rose-50 text-rose-800",
      cardClass: "border-rose-400/35 bg-rose-500/10",
      dotClass: "bg-rose-500"
    } as const;
  }

  if (days <= 180) {
    return {
      tone: "warning",
      label: `Mendekati ED ${days} hari`,
      detail: "Prioritaskan FEFO dan distribusi terencana.",
      badgeClass: "border-amber-300/50 bg-amber-50 text-amber-800",
      cardClass: "border-amber-300/35 bg-amber-400/10",
      dotClass: "bg-amber-400"
    } as const;
  }

  return {
    tone: "safe",
    label: `ED aman ${days} hari`,
    detail: "Tetap gunakan FEFO sesuai urutan kedaluwarsa.",
    badgeClass: "border-teal/25 bg-teal-50 text-teal-800",
    cardClass: "border-teal/20 bg-teal/10",
    dotClass: "bg-teal-500"
  } as const;
}
