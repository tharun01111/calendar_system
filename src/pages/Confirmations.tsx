import { useState, useRef, useEffect, useMemo } from "react";
import { useAcademicStore } from "@/store/useAcademicStore";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  isSameDay, 
  isToday,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isValid
} from "date-fns";
import { Check, Clock, ChevronLeft, ChevronRight, GraduationCap, ArrowLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { CALENDAR_LAYER_COLORS } from "@/types/academic";
import type { CalendarLayerType, BlockState } from "@/types/academic";

// ── tokens ────────────────────────────────────────────────────────────────────
const T = "#4DB6AC";
const T_DARK = "#00897B";
const T_LIGHT = "#E0F2F1";
const T_MID = "#B2DFDB";

const CAT_COLOR: Record<string, string> = {
  GOVERNANCE: "#4DB6AC",
  QUALITY: "#5C6BC0",
  ADMINISTRATION: "#FB8C00",
  EXAMINATION: "#EF5350",
  NBA: "#29B6F6",
  Compliance: "#EF5350",
  Audit: "#FB8C00",
  Meeting: "#4DB6AC",
};

const CAT_BG: Record<string, string> = {
  GOVERNANCE: "#E0F2F1",
  QUALITY: "#E8EAF6",
  ADMINISTRATION: "#FFF3E0",
  EXAMINATION: "#FFEBEE",
  NBA: "#E1F5FE",
  Compliance: "#FFEBEE",
  Audit: "#FFF3E0",
  Meeting: "#E0F2F1",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const MNAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const MSHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ── helpers ───────────────────────────────────────────────────────────────────
const fmtLabel = (s: string, opts?: Intl.DateTimeFormatOptions) => {
  try {
    const d = new Date(s + "T00:00:00");
    if (!isValid(d)) return s;
    return d.toLocaleDateString("en-GB", opts);
  } catch (e) {
    return s;
  }
};

function getWeekDates(centerDate: string) {
  const base = new Date(centerDate + "T00:00:00");
  const dow = base.getDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + mondayOffset + i);
    return d;
  });
}

function dateObjToStr(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function addDaysStr(ds: string, n: number) {
  const d = new Date(ds + "T00:00:00");
  d.setDate(d.getDate() + n);
  return dateObjToStr(d);
}

// ── Modals ────────────────────────────────────────────────────────────────────
function Modal({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(10,30,30,0.52)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(3px)" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "28px 30px", maxWidth: 440, width: "92%", boxShadow: "0 16px 56px rgba(0,0,0,0.22)" }}>
        {children}
      </div>
    </div>
  );
}

function DateConfirmModal({ eventName, newDate, onConfirm, onCancel }: { eventName: string, newDate: string, onConfirm: () => void, onCancel: () => void }) {
  return (
    <Modal>
      <div style={{ fontSize: 10, fontWeight: 800, color: T, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Confirm Date Selection</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: "#1a2e2e", marginBottom: 14 }}>{eventName}</div>
      <div style={{ background: T_LIGHT, borderRadius: 10, padding: "14px 16px", textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: "#78909c", marginBottom: 4, letterSpacing: 1 }}>SELECTED DATE</div>
        <div style={{ fontWeight: 700, fontSize: 19, color: "#1a2e2e", fontFamily: "Georgia, serif" }}>
          {fmtLabel(newDate, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </div>
      </div>
      <p style={{ fontSize: 13, color: "#607d8b", marginBottom: 20, lineHeight: 1.65 }}>
        Would you like to set this as the confirmed date for this event?
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "11px", border: "1.5px solid #dbe8e8", borderRadius: 9, background: "#fff", cursor: "pointer", fontSize: 13, color: "#455a64", fontWeight: 600 }}>Cancel</button>
        <button onClick={onConfirm} style={{ flex: 1, padding: "11px", border: "none", borderRadius: 9, background: T, cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 700 }}>Yes, Confirm Date</button>
      </div>
    </Modal>
  );
}

function RescheduleModal({ eventName, fromDate, toDate, toDay, toHour, onConfirm, onCancel }: { eventName: string, fromDate: string, toDate: string, toDay?: string, toHour?: number, onConfirm: () => void, onCancel: () => void }) {
  return (
    <Modal>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 24 }}>📅</span>
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: T, letterSpacing: 2, textTransform: "uppercase" }}>Reschedule Event</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "#1a2e2e" }}>{eventName}</div>
        </div>
      </div>
      <div style={{ background: "#f7fafa", borderRadius: 10, padding: "14px 16px", marginBottom: 18, lineHeight: 1.7 }}>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: "#90a4ae", fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>CURRENT DATE</div>
          <div style={{ fontWeight: 600, fontSize: 13, color: "#455a64" }}>{fmtLabel(fromDate, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
        </div>
        <div style={{ borderTop: "1px dashed #dbe8e8", paddingTop: 8 }}>
          <div style={{ fontSize: 10, color: "#90a4ae", fontWeight: 700, letterSpacing: 1, marginBottom: 2 }}>PROPOSED DATE</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: T_DARK }}>
            {toDay ? `${toDay} · ${toHour}:00 — ` : ""}
            {fmtLabel(toDate, { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </div>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "#607d8b", marginBottom: 20, lineHeight: 1.65 }}>
        Would you like to proceed with rescheduling this event to the proposed date and time?
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={onCancel} style={{ flex: 1, padding: "11px", border: "1.5px solid #dbe8e8", borderRadius: 9, background: "#fff", cursor: "pointer", fontSize: 13, color: "#455a64", fontWeight: 600 }}>Keep Current Date</button>
        <button onClick={onConfirm} style={{ flex: 1, padding: "11px", border: "none", borderRadius: 9, background: T, cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 700 }}>Yes, Reschedule</button>
      </div>
    </Modal>
  );
}

// ── Question Nav Strip ────────────────────────────────────────────────────────
function QuestionNavStrip({ items, currentIdx, onSelect }: { items: any[], currentIdx: number, onSelect: (i: number) => void }) {
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = stripRef.current;
    if (!container) return;
    const el = container.children[currentIdx] as HTMLElement;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [currentIdx]);

  const btnS = (dis: boolean) => ({
    width: 30, height: 30, borderRadius: 7, border: "1.5px solid #dbe8e8",
    background: dis ? "#f5f7f7" : "#fff", cursor: dis ? "not-allowed" : "pointer",
    color: dis ? "#c8d6d6" : "#455a64", fontSize: 17, fontWeight: 700,
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, lineHeight: 1
  });

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e4eded", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 10px", gap: 6, borderBottom: "1px solid #edf3f3" }}>
        <button onClick={() => onSelect(Math.max(0, currentIdx - 1))} disabled={currentIdx === 0} style={btnS(currentIdx === 0) as any}>‹</button>
        <div ref={stripRef} style={{ display: "flex", gap: 5, overflowX: "auto", flex: 1, scrollbarWidth: "none", padding: "2px 0" }}>
          {items.map((item, i) => {
            const done = item.block.state === "confirmed";
            const skip = item.block.state === "on-hold" || item.block.state === "rejected";
            const cur = i === currentIdx;
            return (
              <div key={item.block.id} onClick={() => onSelect(i)} style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: 8, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                fontWeight: cur ? 700 : 500, transition: "all 0.15s",
                border: `1.5px solid ${cur ? T : done ? T_MID : skip ? "#ffccbc" : "#e0e7e7"}`,
                background: cur ? T : done ? T_LIGHT : skip ? "#fff3f0" : "#f5f9f9",
                color: cur ? "#fff" : done ? T_DARK : skip ? "#bf360c" : "#607d8b"
              }}>
                {done ? "✓" : skip ? "–" : i + 1}
              </div>
            );
          })}
        </div>
        <button onClick={() => onSelect(Math.min(items.length - 1, currentIdx + 1))} disabled={currentIdx === items.length - 1} style={btnS(currentIdx === items.length - 1) as any}>›</button>
      </div>
      <div style={{ padding: "7px 12px", background: "#f9fbfb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#1a2e2e", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>{items[currentIdx]?.block.name}</span>
        <span style={{ fontSize: 10, color: "#78909c", whiteSpace: "nowrap", flexShrink: 0 }}>Q {currentIdx + 1}/{items.length}</span>
      </div>
    </div>
  );
}

// ── Mini Calendar ─────────────────────────────────────────────────────────────
function MiniCal({ year, month, events, highlightDate, onDateClick, onPrev, onNext }: { year: number, month: number, events: any[], highlightDate?: string | null, onDateClick: (y: number, m: number, d: number) => void, onPrev: () => void, onNext: () => void }) {
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const firstDay = (y: number, m: number) => new Date(y, m, 1).getDay();
  
  const total = daysInMonth(year, month);
  const start = firstDay(year, month);
  const cells = [...Array(start).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  
  const evDays = new Set(
    events.map(ev => {
      const d = parseISO(ev.date);
      return (d.getFullYear() === year && d.getMonth() === month) ? d.getDate() : null;
    }).filter(Boolean)
  );

  const hlDay = (() => {
    if (!highlightDate) return null;
    const d = parseISO(highlightDate);
    return (d.getFullYear() === year && d.getMonth() === month) ? d.getDate() : null;
  })();

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "14px 12px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: "1px solid #e4eded" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={onPrev} style={{ border: "none", background: "none", cursor: "pointer", color: "#607d8b", fontSize: 18, padding: "2px 6px" }}>‹</button>
        <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 13, color: "#1a2e2e" }}>{MNAMES[month]} {year}</span>
        <button onClick={onNext} style={{ border: "none", background: "none", cursor: "pointer", color: "#607d8b", fontSize: 18, padding: "2px 6px" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#90a4ae", paddingBottom: 4 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={"e" + i} />;
          const has = evDays.has(d);
          const isHL = d === hlDay;
          return (
            <div key={"d" + i} onClick={() => onDateClick(year, month, d)}
              style={{ textAlign: "center", fontSize: 12, borderRadius: 6, padding: "5px 2px", cursor: "pointer", position: "relative", background: isHL ? T : "transparent", color: isHL ? "#fff" : "#333", fontWeight: (has || isHL) ? "700" : "400", transition: "background 0.12s" }}
            >
              {d}
              {has && !isHL && <span style={{ position: "absolute", bottom: 1, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: "50%", background: T, display: "block" }} />}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: "4px 8px" }}>
        {Object.entries(CAT_COLOR).slice(0, 5).map(([k, v]) => (
          <span key={k} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: "#607d8b" }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: v, display: "inline-block" }} />
            {k.charAt(0) + k.slice(1).toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Monthly Timeline ──────────────────────────────────────────────────────────
function MonthlyTimeline({ items, highlightDate, rightRef, dateRefs, onDateClick }: { items: any[], highlightDate?: string | null, rightRef: any, dateRefs: any, onDateClick: (ds: string) => void }) {
  // Generate Apr–Jul 2026 as a fallback or based on items range
  const allEvents = items.map(it => it.event);
  const minDate = allEvents.length ? new Date(Math.min(...allEvents.map(e => new Date(e.date).getTime()))) : new Date();
  const maxDate = allEvents.length ? new Date(Math.max(...allEvents.map(e => new Date(e.date).getTime()))) : new Date();
  
  const start = startOfMonth(minDate);
  const end = endOfMonth(maxDate);
  const allDates = eachDayOfInterval({ start, end }).map(d => format(d, 'yyyy-MM-dd'));

  const byMonth: Record<string, string[]> = {};
  allDates.forEach(ds => {
    const m = parseISO(ds).getMonth();
    const y = parseISO(ds).getFullYear();
    const key = `${y}-${m}`;
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(ds);
  });

  return (
    <div ref={rightRef} style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
      {Object.entries(byMonth).map(([key, dates]) => {
        const [year, mo] = key.split('-').map(Number);
        return (
          <div key={key}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#90a4ae", letterSpacing: 3, marginBottom: 10, marginTop: 4, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, borderTop: "1px solid #e8f0ef" }} />
              {MNAMES[mo]} {year}
              <span style={{ flex: 1, borderTop: "1px solid #e8f0ef" }} />
            </div>
            {dates.map(ds => {
              const dayItems = items.filter(it => it.event.date === ds);
              const isHL = highlightDate === ds;
              return (
                <div key={ds}
                  ref={el => { dateRefs.current[ds] = el; }}
                  onClick={() => onDateClick(ds)}
                  style={{ background: isHL ? "#e0faf7" : "#fff", border: `1.5px solid ${isHL ? T : "#e4eeed"}`, borderRadius: 10, padding: "11px 14px", marginBottom: 7, cursor: "pointer", transition: "border 0.3s, background 0.3s", boxShadow: isHL ? "0 0 0 3px rgba(77,182,172,0.2)" : "0 1px 4px rgba(0,0,0,0.05)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: isHL ? T_DARK : "#90a4ae", marginBottom: dayItems.length ? 8 : 0, letterSpacing: 0.5 }}>
                    {fmtLabel(ds, { weekday: "short", day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                  {dayItems.length === 0
                    ? <div style={{ fontSize: 11, color: "#c8d6d6", fontStyle: "italic" }}>No events scheduled</div>
                    : dayItems.map(it => {
                      const { block, event, template } = it;
                      const confirmed = block.state === "confirmed";
                      const skipped = block.state === "on-hold" || block.state === "rejected";
                      const cc = CAT_COLOR[block.category || ''] || T;
                      const cbg = CAT_BG[block.category || ''] || T_LIGHT;
                      return (
                        <div key={block.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: cbg, borderRadius: 8, padding: "9px 11px", marginBottom: 4, border: `1px solid ${cc}33`, opacity: confirmed ? 1 : skipped ? 0.45 : 0.6, transition: "opacity 0.3s" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "#1a2e2e", marginBottom: 2 }}>{block.name}</div>
                            <div style={{ fontSize: 11, color: "#607d8b", marginBottom: 4 }}>{template.layerEntityName || template.name}</div>
                            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                              <span style={{ background: "#f0f4f4", color: "#455a64", fontSize: 10, borderRadius: 4, padding: "2px 6px" }}>System</span>
                              <span style={{ background: cc + "22", color: cc, fontSize: 10, borderRadius: 4, padding: "2px 6px", fontWeight: 600 }}>{block.category || 'Event'}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0, marginLeft: 8 }}>
                            <span style={{ background: cc + "22", color: cc, fontSize: 10, borderRadius: 5, padding: "3px 8px", fontWeight: 700 }}>{block.category || 'Event'}</span>
                            {confirmed && <span style={{ fontSize: 10, color: T_DARK, fontWeight: 700 }}>✓ Confirmed</span>}
                            {skipped && <span style={{ fontSize: 10, color: "#f9a825", fontWeight: 700 }}>⏭ Pending</span>}
                            {!confirmed && !skipped && <span style={{ fontSize: 10, color: "#b0bec5", fontWeight: 500 }}>Unreviewed</span>}
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── Weekly Grid (editor) ──────────────────────────────────────────────────────
function WeeklyGrid({ centerDate, items, pendingAssignId, onCellClick, onEventClick }: { centerDate: string, items: any[], pendingAssignId: string | null, onCellClick: (day: string, hour: number, date: Date) => void, onEventClick: (q: any) => void }) {
  const weekDates = getWeekDates(centerDate);
  const dateStrMap: Record<string, any[]> = {};
  weekDates.forEach(wd => { dateStrMap[dateObjToStr(wd)] = []; });

  items.forEach(it => {
    const ds = it.event.date;
    if (dateStrMap[ds] !== undefined) {
      dateStrMap[ds].push({
        q: it,
        hour: it.event.startHour || 9,
        confirmed: it.block.state === "confirmed",
        skipped: it.block.state === "on-hold" || it.block.state === "rejected",
        isPending: it.block.id === pendingAssignId
      });
    }
  });

  const bV = "1.5px solid #d4e8e5", bH = "1px solid #e8f0ef";
  const weekStart = weekDates[0], weekEnd = weekDates[5];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: "#78909c", fontWeight: 600 }}>
          {fmtLabel(dateObjToStr(weekStart), { day: "2-digit", month: "short" })} – {fmtLabel(dateObjToStr(weekEnd), { day: "2-digit", month: "short", year: "numeric" })}
        </span>
        <span style={{ fontSize: 11, color: "#90a4ae" }}>Click a free cell to assign · Click an event to reassign</span>
      </div>
      <div style={{ borderRadius: 12, border: `2px solid ${T_MID}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f0f9f8", borderBottom: `2px solid ${T_MID}` }}>
              <th style={{ width: 62, padding: "10px 10px", textAlign: "right", color: "#90a4ae", fontWeight: 800, fontSize: 10, letterSpacing: 1.5, borderRight: bV }}>TIME</th>
              {DAYS.map((d, i) => {
                const wd = weekDates[i];
                const ds = dateObjToStr(wd);
                const isToday = wd.toDateString() === new Date().toDateString();
                const hasEv = dateStrMap[ds]?.length > 0;
                return (
                  <th key={d} style={{ padding: "8px 6px", textAlign: "center", borderLeft: bV, background: isToday ? T_LIGHT : "transparent", minWidth: 110 }}>
                    <div style={{ fontWeight: 800, fontSize: 11, color: isToday ? T_DARK : "#607d8b", letterSpacing: 0.5 }}>{d}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isToday ? "#fff" : "#1a2e2e", background: isToday ? T : "transparent", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", margin: "3px auto 1px" }}>{wd.getDate()}</div>
                    <div style={{ fontSize: 9, color: "#90a4ae" }}>{MSHORT[wd.getMonth()]}</div>
                    {hasEv && <div style={{ width: 5, height: 5, borderRadius: "50%", background: T, margin: "3px auto 0" }} />}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {HOURS.map((h, hi) => (
              <tr key={h}>
                <td style={{ fontSize: 11, color: "#90a4ae", padding: "0 10px", verticalAlign: "middle", height: 54, borderRight: bV, borderBottom: bH, fontWeight: 600, background: "#fafefe", textAlign: "right", whiteSpace: "nowrap" }}>{h}:00</td>
                {DAYS.map((d, di) => {
                  const ds = dateObjToStr(weekDates[di]);
                  const slotEvs = (dateStrMap[ds] || []).filter(e => e.hour === h);
                  const isFree = slotEvs.length === 0;
                  return (
                    <td key={d}
                      onClick={() => isFree && pendingAssignId && onCellClick(d, h, weekDates[di])}
                      style={{ borderLeft: bV, borderBottom: bH, padding: 4, verticalAlign: "top", height: 54, background: hi % 2 === 0 ? "#fafefe" : "#fff", cursor: pendingAssignId && isFree ? "crosshair" : "default", transition: "background 0.1s" }}
                    >
                      {isFree
                        ? <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {pendingAssignId
                            ? <span style={{ fontSize: 10, color: T, fontWeight: 700, opacity: 0.7 }}>+ Assign</span>
                            : <span style={{ fontSize: 10, color: "#c8d6d6", fontStyle: "italic" }}>Free</span>}
                        </div>
                        : slotEvs.map((ev, ei) => {
                          const cc = CAT_COLOR[ev.q.block.category || ''] || T;
                          const cbg = CAT_BG[ev.q.block.category || ''] || T_LIGHT;
                          return (
                            <div key={ei}
                              onClick={e => { e.stopPropagation(); onEventClick(ev.q); }}
                              style={{ background: cbg, color: cc, border: `2px solid ${cc}${ev.confirmed ? "99" : "33"}`, borderRadius: 7, padding: "4px 7px", fontSize: 10, fontWeight: 700, height: 46, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", lineHeight: 1.2, cursor: "pointer", opacity: ev.confirmed ? 1 : ev.skipped ? 0.35 : 0.5, transition: "all 0.25s", boxShadow: ev.confirmed ? `0 2px 8px ${cc}44` : "none" }}>
                              {ev.q.block.name.length > 22 ? ev.q.block.name.slice(0, 20) + "…" : ev.q.block.name}
                            </div>
                          );
                        })
                      }
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Confirmations() {
  const store = useAcademicStore();
  const navigate = useNavigate();
  const [qIdx, setQIdx] = useState(0);
  const [calYear, setCalYear] = useState(2026);
  const [calMonth, setCalMonth] = useState(3);
  const [hlDate, setHlDate] = useState<string | null>(null);
  const [activeView, setActiveView] = useState("Monthly");
  const [dateModal, setDateModal] = useState<any>(null);
  const [reschedModal, setReschedModal] = useState<any>(null);
  const [pendingAssignId, setPendingAssignId] = useState<string | null>(null);

  const rightRef = useRef<HTMLDivElement>(null);
  const dateRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Gather all confirmable blocks
  const confirmableBlocks = useMemo(() => {
    const items: { block: any; event: any; template: any }[] = [];
    for (const template of store.templates) {
      for (const block of template.blocks) {
        if (block.locked || !block.active) continue;
        const event = template.scheduledEvents.find(e => e.blockId === block.id);
        if (event) {
          items.push({ block, event, template });
        }
      }
    }
    return items;
  }, [store.templates]);

  useEffect(() => {
    if (confirmableBlocks.length > 0) {
      const d = parseISO(confirmableBlocks[qIdx]?.event.date || new Date().toISOString());
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
    }
  }, [confirmableBlocks.length]);

  if (confirmableBlocks.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center p-8 bg-card rounded-2xl border border-border max-w-md">
          <GraduationCap className="w-12 h-12 text-accent mx-auto mb-4" />
          <h1 className="text-2xl font-display font-bold mb-2">No events to confirm</h1>
          <p className="text-muted-foreground mb-6">Create a template and schedule some activities to begin the confirmation flow.</p>
          <button onClick={() => navigate("/dashboard")} className="px-6 py-2 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const q = confirmableBlocks[qIdx];
  const confirmedCount = confirmableBlocks.filter(it => it.block.state === "confirmed").length;
  const allDone = confirmableBlocks.every(it => it.block.state === "confirmed" || it.block.state === "on-hold" || it.block.state === "rejected");
  const catC = (q.block.category && CAT_COLOR[q.block.category]) || T;

  function scrollToDate(ds: string) {
    setHlDate(ds);
    setTimeout(() => setHlDate(null), 5000);
    setTimeout(() => {
      const el = dateRefs.current[ds];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }

  function goToQuestion(i: number) {
    setQIdx(i);
    const nq = confirmableBlocks[i];
    const nd = nq.event.date;
    scrollToDate(nd);
    const p = parseISO(nd);
    setCalYear(p.getFullYear());
    setCalMonth(p.getMonth());
  }

  function pickStatus(status: BlockState) {
    store.setConfirmationStatus(q.block.id, status);
    setTimeout(() => {
      if (qIdx < confirmableBlocks.length - 1) setQIdx(i => i + 1);
    }, 380);
  }

  function handleCalClick(y: number, m: number, d: number) {
    const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    scrollToDate(ds);
  }

  function handleRightDateClick(ds: string) {
    scrollToDate(ds);
    setDateModal({ q, newDate: ds });
  }

  function handleDateModalConfirm() {
    const { q: mq, newDate } = dateModal;
    store.moveEvent(mq.event.id, newDate, mq.event.startHour);
    store.setConfirmationStatus(mq.block.id, "confirmed");
    setDateModal(null);
    scrollToDate(newDate);
    const p = parseISO(newDate);
    setCalYear(p.getFullYear()); setCalMonth(p.getMonth());
    setTimeout(() => { if (qIdx < confirmableBlocks.length - 1) setQIdx(i => i + 1); }, 400);
  }

  function handleWeeklyCellClick(day: string, hour: number, dateObj: Date) {
    if (!pendingAssignId) return;
    const pq = confirmableBlocks.find(it => it.block.id === pendingAssignId);
    if (!pq) return;
    const ds = dateObjToStr(dateObj);
    setReschedModal({ q: pq, fromDate: pq.event.date, toDate: ds, toDay: day, toHour: hour });
  }

  function handleEventClick(evQ: any) {
    setPendingAssignId(evQ.block.id);
  }

  function handleReschedConfirm() {
    const { q: rq, toDate, toHour } = reschedModal;
    store.moveEvent(rq.event.id, toDate, toHour);
    store.setConfirmationStatus(rq.block.id, "confirmed");
    scrollToDate(toDate);
    const p = parseISO(toDate); setCalYear(p.getFullYear()); setCalMonth(p.getMonth());
    setPendingAssignId(null);
    setReschedModal(null);
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif", background: "#eef3f3" }}>

      {/* ── Modals ── */}
      {dateModal && (
        <DateConfirmModal
          eventName={dateModal.q.block.name}
          newDate={dateModal.newDate}
          onConfirm={handleDateModalConfirm}
          onCancel={() => setDateModal(null)}
        />
      )}
      {reschedModal && (
        <RescheduleModal
          eventName={reschedModal.q.block.name}
          fromDate={reschedModal.fromDate}
          toDate={reschedModal.toDate}
          toDay={reschedModal.toDay}
          toHour={reschedModal.toHour}
          onConfirm={handleReschedConfirm}
          onCancel={() => { setReschedModal(null); setPendingAssignId(null); }}
        />
      )}

      {/* ══ LEFT PANEL ══ */}
      <div style={{ width: "36%", minWidth: 310, maxWidth: 430, display: "flex", flexDirection: "column", background: "#f7fafa", borderRight: "1.5px solid #dbe8e8", overflowY: "auto", flexShrink: 0 }}>
        {/* header */}
        <div style={{ padding: "16px 18px 10px", borderBottom: "1px solid #e4eded", flexShrink: 0 }}>
          <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 17, color: "#1a2e2e" }}>Event Confirmation</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
            <span style={{ fontSize: 12, color: "#78909c" }}>Question {qIdx + 1} of {confirmableBlocks.length}</span>
            <span style={{ fontSize: 12, color: T_DARK, fontWeight: 600 }}>{confirmedCount}/{confirmableBlocks.length} confirmed</span>
          </div>
          <div style={{ marginTop: 8, height: 4, borderRadius: 2, background: "#dbe8e8" }}>
            <div style={{ height: "100%", borderRadius: 2, background: T, width: `${(confirmedCount / confirmableBlocks.length) * 100}%`, transition: "width 0.4s" }} />
          </div>
        </div>

        <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 11 }}>
          <QuestionNavStrip items={confirmableBlocks} currentIdx={qIdx} onSelect={goToQuestion} />

          <div style={{ background: "#fff", borderRadius: 12, padding: "15px", boxShadow: "0 1px 6px rgba(0,0,0,0.07)", border: `1.5px solid ${catC}33` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ background: catC + "22", color: catC, fontSize: 10, fontWeight: 800, borderRadius: 5, padding: "3px 8px", letterSpacing: 1, textTransform: "uppercase" }}>{q.block.category || 'EVENT'}</span>
              <span style={{ fontSize: 11, color: "#78909c" }}>{q.template.layerEntityName || q.template.name}</span>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#1a2e2e", marginBottom: 4 }}>{q.block.name}</div>
            <div style={{ fontSize: 12, color: "#78909c", marginBottom: 12 }}>{q.block.notes || 'No description provided.'}</div>

            <div style={{ background: catC + "11", border: `1px solid ${catC}33`, borderRadius: 9, padding: "10px 14px", textAlign: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 9, color: "#90a4ae", marginBottom: 2, letterSpacing: 1 }}>SCHEDULED ON</div>
              <div style={{ fontWeight: 700, fontSize: 17, color: "#1a2e2e", fontFamily: "Georgia, serif" }}>
                {fmtLabel(q.event.date, { day: "2-digit", month: "long", year: "numeric" })}
              </div>
              <div style={{ fontSize: 10, color: "#90a4ae", marginTop: 4 }}>Click any date on the right to reschedule</div>
            </div>

            <div style={{ fontSize: 11, color: "#455a64", marginBottom: 8, fontWeight: 600 }}>Confirm this event date?</div>
            {[
              { key: "confirmed", label: "Yes, confirm this date", icon: "✓" },
              { key: "on-hold", label: "Skip / Pending review", icon: "⏭" }
            ].map(opt => {
              const sel = q.block.state === opt.key;
              const isConf = opt.key === "confirmed";
              return (
                <div key={opt.key} onClick={() => pickStatus(opt.key as BlockState)} style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 12px", border: `1.5px solid ${sel ? (isConf ? T : "#f9a825") : "#e5eded"}`, borderRadius: 8, marginBottom: 7, cursor: "pointer", background: sel ? (isConf ? T_LIGHT : "#fffde7") : "#fafefe", transition: "all 0.15s" }}>
                  <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${sel ? (isConf ? T : "#f9a825") : "#b0bec5"}`, background: sel ? (isConf ? T : "#f9a825") : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 9, color: sel ? "#fff" : "transparent", transition: "all 0.15s" }}>{opt.icon}</span>
                  <span style={{ fontSize: 13, color: sel ? (isConf ? T_DARK : "#e65100") : "#2d3a3a", fontWeight: sel ? 600 : 400 }}>{opt.label}</span>
                </div>
              );
            })}

            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={() => goToQuestion(Math.max(0, qIdx - 1))} disabled={qIdx === 0} style={{ flex: 1, padding: "9px", border: "1.5px solid #dbe8e8", borderRadius: 8, background: "#fff", cursor: qIdx === 0 ? "not-allowed" : "pointer", color: qIdx === 0 ? "#b2c0c0" : "#455a64", fontSize: 12, fontWeight: 600 }}>← Back</button>
              <button onClick={() => goToQuestion(Math.min(confirmableBlocks.length - 1, qIdx + 1))} disabled={qIdx === confirmableBlocks.length - 1} style={{ flex: 1, padding: "9px", border: "none", borderRadius: 8, background: qIdx === confirmableBlocks.length - 1 ? "#b2dfdb" : T, cursor: qIdx === confirmableBlocks.length - 1 ? "not-allowed" : "pointer", color: "#fff", fontSize: 12, fontWeight: 700 }}>Next →</button>
            </div>
          </div>

          <MiniCal
            year={calYear} month={calMonth}
            events={confirmableBlocks.map(it => it.event)}
            highlightDate={q.event.date}
            onDateClick={handleCalClick}
            onPrev={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
            onNext={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
          />

          <button onClick={() => navigate("/final-calendar")} style={{ width: "100%", padding: "12px", border: "none", borderRadius: 10, background: allDone ? T_DARK : T, cursor: "pointer", color: "#fff", fontSize: 13, fontWeight: 700, letterSpacing: 0.3 }}>
            {allDone ? "🎉 View Final Calendar →" : confirmedCount > 0 ? "Preview Calendar →" : "Confirm events to preview →"}
          </button>
        </div>
      </div>

      {/* ══ RIGHT PANEL ══ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", background: "#fff", borderBottom: "1.5px solid #dbe8e8", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 18, color: "#1a2e2e" }}>Calendar Editor</div>
            <div style={{ fontSize: 12, color: "#78909c", marginTop: 1 }}>
              {pendingAssignId
                ? <span style={{ color: "#e65100", fontWeight: 700 }}>
                  📌 Click a free slot to reassign — <span onClick={() => setPendingAssignId(null)} style={{ cursor: "pointer", textDecoration: "underline", color: T_DARK }}>cancel</span>
                </span>
                : "Click a date to reschedule · Click a weekly event to reassign"
              }
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", background: "#f0f4f4", borderRadius: 9, padding: 3, gap: 2 }}>
              {["Monthly", "Weekly"].map(v => (
                <button key={v} onClick={() => setActiveView(v)} style={{ padding: "6px 14px", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600, background: activeView === v ? "#fff" : "transparent", color: activeView === v ? T_DARK : "#78909c", boxShadow: activeView === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>{v}</button>
              ))}
            </div>
            <button onClick={() => navigate("/final-calendar")} style={{ padding: "8px 16px", border: "none", borderRadius: 8, background: T, cursor: "pointer", fontSize: 12, color: "#fff", fontWeight: 700 }}>Finalize Calendar →</button>
          </div>
        </div>

        {activeView === "Monthly" && (
          <MonthlyTimeline
            items={confirmableBlocks}
            highlightDate={hlDate}
            rightRef={rightRef}
            dateRefs={dateRefs}
            onDateClick={handleRightDateClick}
          />
        )}
        {activeView === "Weekly" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
            {pendingAssignId && (
              <div style={{ background: "#fffde7", border: "1.5px solid #ffe082", borderRadius: 10, padding: "11px 16px", marginBottom: 14, fontSize: 12, color: "#e65100", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📌</span>
                <span>Click any free cell to assign <strong>"{confirmableBlocks.find(it => it.block.id === pendingAssignId)?.block.name}"</strong> to that day and time slot.</span>
                <button onClick={() => setPendingAssignId(null)} style={{ marginLeft: "auto", border: "none", background: "transparent", cursor: "pointer", color: T_DARK, fontWeight: 700, textDecoration: "underline", fontSize: 12, flexShrink: 0 }}>Cancel</button>
              </div>
            )}
            <WeeklyGrid
              centerDate={q.event.date}
              items={confirmableBlocks}
              pendingAssignId={pendingAssignId}
              onCellClick={handleWeeklyCellClick}
              onEventClick={handleEventClick}
            />
          </div>
        )}
      </div>
    </div>
  );
}
