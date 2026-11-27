// Генерация iCalendar (.ics) — работает и на сервере, и в браузере.
export type IcsEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at?: string | null;
  address?: string;
  notes?: string;
  url?: string;
};

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
// Строки длиннее 75 октетов переносим по стандарту
const fold = (line: string) => line.match(/.{1,70}/g)!.join("\r\n ");

export function buildIcs(events: IcsEvent[], calName = "GoGlobal") {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GoGlobal.kz//Demo//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(calName)}`,
    "X-WR-TIMEZONE:Asia/Almaty",
  ];
  for (const e of events) {
    const end = e.ends_at ?? new Date(Date.parse(e.starts_at) + 60 * 60 * 1000).toISOString();
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.id}@goglobal.kz`,
      `DTSTAMP:${stamp(new Date().toISOString())}`,
      `DTSTART:${stamp(e.starts_at)}`,
      `DTEND:${stamp(end)}`,
      fold(`SUMMARY:${esc(e.title)}`),
      ...(e.address ? [fold(`LOCATION:${esc(e.address)}`)] : []),
      ...(e.notes || e.url ? [fold(`DESCRIPTION:${esc([e.notes, e.url].filter(Boolean).join("\n"))}`)] : []),
      // напоминания за сутки и за час
      "BEGIN:VALARM", "TRIGGER:-PT24H", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, "END:VALARM",
      "BEGIN:VALARM", "TRIGGER:-PT1H", "ACTION:DISPLAY", `DESCRIPTION:${esc(e.title)}`, "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

export function downloadIcs(events: IcsEvent[], filename = "goglobal.ics") {
  const blob = new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
