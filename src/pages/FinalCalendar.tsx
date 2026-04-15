import { useState, useMemo, useEffect } from "react";
import { useAcademicStore } from "@/store/useAcademicStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { 
  format, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isValid 
} from "date-fns";
import { GraduationCap } from "lucide-react";

// ── tokens ────────────────────────────────────────────────────────────────────
const T = "#4DB6AC";
const T_DARK = "#00897B";
const T_LIGHT = "#E0F2F1";
const T_MID = "#B2DFDB";

const CAT_COLOR: Record<string, string> = {
  governance: "#4DB6AC",
  quality: "#5C6BC0",
  administration: "#FB8C00",
  examination: "#EF5350",
  nba: "#29B6F6",
  compliance: "#EF5350",
  audit: "#FB8C00",
  meeting: "#4DB6AC",
};

const CAT_BG: Record<string, string> = {
  governance: "#E0F2F1",
  quality: "#E8EAF6",
  administration: "#FFF3E0",
  examination: "#FFEBEE",
  nba: "#E1F5FE",
  compliance: "#FFEBEE",
  audit: "#FFF3E0",
  meeting: "#E0F2F1",
};

const MNAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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

const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
const firstDay = (y: number, m: number) => new Date(y, m, 1).getDay();
const fmt = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

// ── Final: Monthly grid ───────────────────────────────────────────────────────
function FinalMonthly({ items }: { items: any[] }) {
  const [yr, setYr] = useState(2026);
  const [mo, setMo] = useState(3); // April
  const total = daysInMonth(yr, mo);
  const start = firstDay(yr, mo);
  const cells = [...Array(start).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "20px 20px 12px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 } as any}>
        <button onClick={() => { if (mo === 0) { setMo(11); setYr(y => y - 1); } else setMo(m => m - 1); }} style={{ border: "none", background: T_LIGHT, color: T_DARK, width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
        <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 18, color: "#1a2e2e" }}>{MNAMES[mo]} {yr}</span>
        <button onClick={() => { if (mo === 11) { setMo(0); setYr(y => y + 1); } else setMo(m => m + 1); }} style={{ border: "none", background: T_LIGHT, color: T_DARK, width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "#90a4ae", paddingBottom: 6 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={"e" + i} style={{ minHeight: 80 }} />;
          const ds = fmt(yr, mo, d);
          const confItems = items.filter(it => it.event.date === ds && it.block.state === "confirmed");
          const skipItems = items.filter(it => it.event.date === ds && (it.block.state === "on-hold" || it.block.state === "rejected"));
          return (
            <div key={"d" + i} style={{ minHeight: 80, background: confItems.length ? "#f0fdfb" : skipItems.length ? "#fffde7" : "#f9fafb", borderRadius: 8, padding: "5px 5px 4px", border: `1px solid ${confItems.length ? T_MID : skipItems.length ? "#ffe082" : "#edf2f2"}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: confItems.length ? T_DARK : skipItems.length ? "#f9a825" : "#b0bec5", marginBottom: 3 }}>{d}</div>
              {confItems.map(it => {
                return (
                  <div key={it.block.id} title={it.block.name} style={{ color: T_DARK, fontSize: 10, padding: "1px 2px", marginBottom: 2, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: T, flexShrink: 0 }} />
                    {it.block.name}
                  </div>
                );
              })}
              {skipItems.map(it => (
                <div key={it.block.id} title={it.block.name} style={{ color: "#f9a825", fontSize: 10, padding: "1px 2px", marginBottom: 2, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.8, display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ fontSize: 9 }}>⏭</span> {it.block.name}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Final: Weekly view ────────────────────────────────────────────────────────
function FinalWeekly({ items }: { items: any[] }) {
  const [center, setCenter] = useState("2026-04-01");
  const weekDates = useMemo(() => {
    const base = new Date(center + "T00:00:00");
    const dow = base.getDay();
    const mondayOffset = dow === 0 ? -6 : 1 - dow;
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + mondayOffset + i);
      return d;
    });
  }, [center]);

  const bV = "1.5px solid #d4e8e5", bH = "1px solid #e8f0ef";
  const weekStart = weekDates[0], weekEnd = weekDates[5];

  const dateStrMap: Record<string, any[]> = {};
  weekDates.forEach(wd => { dateStrMap[format(wd, 'yyyy-MM-dd')] = []; });
  items.forEach(it => {
    const ds = it.event.date;
    if (dateStrMap[ds] !== undefined) {
      dateStrMap[ds].push(it);
    }
  });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => {
          const d = new Date(center + "T00:00:00");
          d.setDate(d.getDate() - 7);
          setCenter(format(d, 'yyyy-MM-dd'));
        }} style={{ border: "none", background: T_LIGHT, color: T_DARK, padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>← Prev Week</button>
        <span style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 16, color: "#1a2e2e" }}>
          {fmtLabel(format(weekStart, 'yyyy-MM-dd'), { day: "2-digit", month: "short" })} – {fmtLabel(format(weekEnd, 'yyyy-MM-dd'), { day: "2-digit", month: "short", year: "numeric" })}
        </span>
        <button onClick={() => {
          const d = new Date(center + "T00:00:00");
          d.setDate(d.getDate() + 7);
          setCenter(format(d, 'yyyy-MM-dd'));
        }} style={{ border: "none", background: T_LIGHT, color: T_DARK, padding: "8px 18px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>Next Week →</button>
      </div>
      <div style={{ borderRadius: 12, border: `2px solid ${T_MID}`, overflow: "hidden", background: "#fff" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f0f9f8", borderBottom: `2px solid ${T_MID}` }}>
              <th style={{ width: 62, padding: "10px 10px", textAlign: "right", color: "#90a4ae", fontWeight: 800, fontSize: 10, letterSpacing: 1.5, borderRight: bV }}>TIME</th>
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => {
                const wd = weekDates[i];
                const isToday = wd.toDateString() === new Date().toDateString();
                const ds = format(wd, 'yyyy-MM-dd');
                const hasEv = dateStrMap[ds]?.length > 0;
                return (
                  <th key={d} style={{ padding: "8px 6px", textAlign: "center", borderLeft: bV, background: isToday ? T_LIGHT : "transparent", minWidth: 110 }}>
                    <div style={{ fontWeight: 800, fontSize: 11, color: isToday ? T_DARK : "#607d8b" }}>{d}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: isToday ? "#fff" : "#1a2e2e", background: isToday ? T : "transparent", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", margin: "3px auto 1px" }}>{wd.getDate()}</div>
                    <div style={{ fontSize: 9, color: "#90a4ae" }}>{format(wd, 'MMM')}</div>
                    {hasEv && <div style={{ width: 5, height: 5, borderRadius: "50%", background: T, margin: "3px auto 0" }} />}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((h, hi) => (
              <tr key={h}>
                <td style={{ fontSize: 11, color: "#90a4ae", padding: "0 10px", verticalAlign: "middle", height: 56, borderRight: bV, borderBottom: bH, fontWeight: 600, background: "#fafefe", textAlign: "right", whiteSpace: "nowrap" }}>{h}:00</td>
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, di) => {
                  const ds = format(weekDates[di], 'yyyy-MM-dd');
                  const slotEvs = (dateStrMap[ds] || []).filter(it => it.event.startHour === h);
                  return (
                    <td key={d} style={{ borderLeft: bV, borderBottom: bH, padding: 4, verticalAlign: "top", height: 56, background: hi % 2 === 0 ? "#fafefe" : "#fff", position: "relative" }}>
                      {slotEvs.length === 0
                        ? <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 10, color: "#c8d6d6", fontStyle: "italic" }}>Free</span></div>
                        : slotEvs.map((it, ei) => {
                          const cat = (it.block.category || '').toLowerCase();
                          const cc = CAT_COLOR[cat] || T;
                          const cbg = CAT_BG[cat] || T_LIGHT;
                          const confirmed = it.block.state === "confirmed";
                          const spanHours = it.event.durationHours || 2;
                          return (
                            <div key={ei} title={it.block.name} style={{ position: "absolute", top: 4, left: 4, right: 4, height: (spanHours * 56) - 8, background: cbg, color: cc, border: `1.5px ${confirmed ? 'solid' : 'dashed'} ${cc}`, borderRadius: 7, padding: "8px", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", lineHeight: 1.3, zIndex: 10 }}>
                              {it.block.name}
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
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10, paddingTop: 10 }}>
        {Object.entries(CAT_COLOR).slice(0, 5).map(([k, v]) => (
          <span key={k} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#607d8b" }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: v, display: "inline-block" }} />
            {k.charAt(0).toUpperCase() + k.slice(1).toLowerCase()}
          </span>
        ))}
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#f9a825" }}>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ffe082", display: "inline-block" }} />Pending
        </span>
      </div>
    </div>
  );
}

// ── Final Page ────────────────────────────────────────────────────────────────
export default function FinalCalendar() {
  const store = useAcademicStore();
  const navigate = useNavigate();
  const [view, setView] = useState("Monthly");
  const [dbItems, setDbItems] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data: cals } = await supabase
        .from('generated_calendars')
        .select(`
          id, start_date, status,
          flow_templates ( name ),
          generated_calendar_events (
            id, scheduled_date, end_date, status,
            flow_activities ( name, stage )
          )
        `)
        .eq('status', 'finalized');

      if (cals) {
        const items: any[] = [];
        const seenEvents = new Set();
        cals.forEach((cal: any) => {
          cal.generated_calendar_events?.forEach((ev: any) => {
            const eventName = ev.flow_activities?.name || 'Flow Event';
            const signature = `${eventName}-${ev.scheduled_date}`;
            
            if (!seenEvents.has(signature)) {
              seenEvents.add(signature);
              const dayItemsCount = items.filter(i => i.event.date === ev.scheduled_date).length;
              const pseudoHour = 9 + (dayItemsCount * 2);
              items.push({
                block: {
                  id: ev.id,
                  name: eventName,
                  category: ev.flow_activities?.stage || 'Administration',
                  state: ev.status === 'confirmed' ? 'confirmed' : 'on-hold',
                },
                event: {
                  id: ev.id,
                  date: ev.scheduled_date,
                  startHour: pseudoHour > 16 ? 16 : pseudoHour,
                  durationHours: eventName.toLowerCase().includes('website review') ? 1 : 2, 
                },
                template: {
                  name: cal.flow_templates?.name || 'Flow Template',
                }
              });
            }
          });
        });
        setDbItems(items);
      }
    })();
  }, []);

  const allItems = useMemo(() => {
    const items: { block: any; event: any; template: any }[] = [];
    for (const template of store.templates) {
      for (const block of template.blocks) {
        if (block.locked || !block.active) continue;
        const event = template.scheduledEvents.find((e: any) => e.blockId === block.id);
        if (event) {
          items.push({ block, event, template });
        }
      }
    }
    return [...items, ...dbItems];
  }, [store.templates, dbItems]);

  const confirmed = allItems.filter(it => it.block.state === "confirmed");
  const skipped = allItems.filter(it => it.block.state === "on-hold" || it.block.state === "rejected");
  const unset = allItems.filter(it => it.block.state === "scheduled");

  return (
    <div style={{ minHeight: "100vh", background: "#eef3f3", fontFamily: "'DM Sans','Segoe UI',system-ui,sans-serif" }}>
      {/* header */}
      <div style={{ background: "#fff", borderBottom: "1.5px solid #dbe8e8", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 22, color: "#1a2e2e" }}>📅 Final Academic Calendar</div>
          <div style={{ fontSize: 12, color: "#78909c", marginTop: 3 }}>
            <span style={{ color: T_DARK, fontWeight: 600 }}>{confirmed.length} confirmed</span>
            {skipped.length > 0 && <span style={{ color: "#f9a825", fontWeight: 600 }}> · {skipped.length} pending</span>}
            {unset.length > 0 && <span style={{ color: "#b0bec5" }}> · {unset.length} unset</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", background: "#f0f4f4", borderRadius: 9, padding: 3, gap: 2 }}>
            {["Monthly", "Weekly"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "7px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, background: view === v ? "#fff" : "transparent", color: view === v ? T_DARK : "#78909c", boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all 0.15s" }}>{v}</button>
            ))}
          </div>
          <button onClick={() => navigate("/dashboard")} style={{ padding: "9px 18px", border: "1.5px solid #dbe8e8", borderRadius: 9, background: "#fff", cursor: "pointer", fontSize: 13, color: "#455a64", fontWeight: 600 }}>← Back to Dashboard</button>
          <button style={{ padding: "9px 18px", border: "none", borderRadius: 9, background: T, cursor: "pointer", fontSize: 13, color: "#fff", fontWeight: 700 }}>Export PDF</button>
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>
        {/* summary chips removed to prevent clutter */}
        {unset.length > 0 && confirmed.length === 0 && skipped.length === 0 && (
          <div style={{ background: "#fff", borderRadius: 12, padding: "24px", textAlign: "center", marginBottom: 20, border: "1.5px dashed #dbe8e8" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#455a64", marginBottom: 4 }}>No events confirmed yet</div>
            <div style={{ fontSize: 13, color: "#90a4ae" }}>Go back to the editor and confirm or skip events to see them here.</div>
          </div>
        )}

        {view === "Monthly" && <FinalMonthly items={allItems} />}
        {view === "Weekly" && <FinalWeekly items={allItems} />}
      </div>
    </div>
  );
}
