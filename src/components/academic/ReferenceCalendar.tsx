import { useMemo, useState } from 'react';
import { useAcademicStore } from '@/store/useAcademicStore';
import {
  format, startOfWeek, addDays, parseISO, isSameDay, subWeeks, addWeeks,
  setMonth, setYear, startOfMonth, isWithinInterval,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, ArrowRight } from 'lucide-react';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const CELL_HEIGHT = 40;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const currentYear = new Date().getFullYear();
const FUTURE_YEARS = Array.from({ length: 6 }, (_, i) => currentYear + i);

export function ReferenceCalendar() {
  const templates = useAcademicStore(s => s.templates);
  const activeTemplateId = useAcademicStore(s => s.activeTemplateId);
  const setActiveTemplate = useAcademicStore(s => s.setActiveTemplate);
  const template = useAcademicStore(s => s.getActiveTemplate());

  const [showNavPicker, setShowNavPicker] = useState(false);

  const initialDate = useMemo(() => {
    if (template?.academicStartDate) return parseISO(template.academicStartDate);
    return new Date();
  }, [template?.academicStartDate]);

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(initialDate, { weekStartsOn: 1 })
  );

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const academicRange = useMemo(() => {
    if (!template) return null;
    return { start: parseISO(template.academicStartDate), end: parseISO(template.academicEndDate) };
  }, [template?.academicStartDate, template?.academicEndDate]);

  const isInAcademicRange = (day: Date) => {
    if (!academicRange) return true;
    return isWithinInterval(day, { start: academicRange.start, end: academicRange.end });
  };

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour12} ${ampm}`;
  };

  const jumpToWeek = (date: Date) => {
    setWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
    setShowNavPicker(false);
  };

  const currentNavMonth = weekStart.getMonth();
  const currentNavYear = weekStart.getFullYear();

  if (!template) return null;

  // START/END markers for this week
  const startEndMarkers = days.reduce<{ date: string; label: string; color: string }[]>((acc, day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    if (dateStr === template.academicStartDate)
      acc.push({ date: dateStr, label: `START – ${format(day, 'dd MMM yyyy')}`, color: '160 50% 78%' });
    if (dateStr === template.academicEndDate)
      acc.push({ date: dateStr, label: `END – ${format(day, 'dd MMM yyyy')}`, color: '0 70% 80%' });
    return acc;
  }, []);

  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      {/* Template selector */}
      {templates.length > 1 && (
        <div className="px-4 py-2 border-b border-border flex items-center gap-2">
          <span className="text-[10px] uppercase text-muted-foreground font-medium">Template:</span>
          <select
            value={activeTemplateId || ''}
            onChange={(e) => setActiveTemplate(e.target.value)}
            className="text-xs bg-muted rounded px-2 py-1 border border-border outline-none"
          >
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Nav header matching planner style */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <button onClick={() => setWeekStart(s => startOfWeek(subWeeks(s, 1), { weekStartsOn: 1 }))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <div className="relative">
          <button
            onClick={() => setShowNavPicker(!showNavPicker)}
            className="flex items-center gap-1.5 text-xs font-medium font-display hover:text-accent transition-colors"
          >
            <CalendarDays className="w-3 h-3" />
            {format(weekStart, 'MMM d')} – {format(addDays(weekStart, 6), 'MMM d, yyyy')}
          </button>

          {showNavPicker && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-card rounded-xl shadow-elevated border border-border z-50 p-3 animate-slide-in">
              <div className="text-[10px] uppercase text-muted-foreground font-medium mb-1.5">Month</div>
              <div className="grid grid-cols-4 gap-1 mb-3">
                {MONTHS.map((m, i) => (
                  <button
                    key={m}
                    onClick={() => jumpToWeek(startOfMonth(setMonth(weekStart, i)))}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      i === currentNavMonth ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="text-[10px] uppercase text-muted-foreground font-medium mb-1.5">Year</div>
              <div className="flex flex-wrap gap-1 mb-3">
                {FUTURE_YEARS.map(y => (
                  <button
                    key={y}
                    onClick={() => jumpToWeek(startOfMonth(setYear(weekStart, y)))}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      y === currentNavYear ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>

              <div className="border-t border-border pt-2 space-y-1">
                <button
                  onClick={() => jumpToWeek(new Date())}
                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3 h-3" /> Jump to Today
                </button>
                <button
                  onClick={() => jumpToWeek(parseISO(template.academicStartDate))}
                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3 h-3" /> Academic Start
                </button>
                <button
                  onClick={() => jumpToWeek(parseISO(template.academicEndDate))}
                  className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                >
                  <ArrowRight className="w-3 h-3" /> Academic End
                </button>
              </div>
            </div>
          )}
        </div>
        <button onClick={() => setWeekStart(s => startOfWeek(addWeeks(s, 1), { weekStartsOn: 1 }))} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* START/END markers */}
      {startEndMarkers.length > 0 && (
        <div className="px-4 py-1 border-b border-border flex gap-3">
          {startEndMarkers.map(m => (
            <span key={m.label} className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{
              backgroundColor: `hsl(${m.color} / 0.3)`,
              color: `hsl(${m.color.split(' ')[0]} 40% 35%)`,
            }}>
              {m.label}
            </span>
          ))}
        </div>
      )}

      <div className="overflow-auto max-h-[420px]">
        <div className="grid" style={{ gridTemplateColumns: '50px repeat(7, 1fr)' }}>
          <div className="bg-card sticky top-0 z-10 border-b border-border" />
          {days.map(day => {
            const inRange = isInAcademicRange(day);
            const dateStr = format(day, 'yyyy-MM-dd');
            const isStart = template.academicStartDate === dateStr;
            const isEnd = template.academicEndDate === dateStr;
            return (
              <div key={day.toISOString()} className={`sticky top-0 z-10 border-b border-l border-border px-1 py-1 text-center ${
                inRange ? 'bg-card' : 'bg-muted/50'
              } ${isStart ? 'ring-inset ring-1 ring-green-400/40' : ''} ${isEnd ? 'ring-inset ring-1 ring-red-400/40' : ''}`}>
                <div className="text-[9px] uppercase text-muted-foreground">{format(day, 'EEE')}</div>
                <div className={`text-xs font-semibold ${!inRange ? 'text-muted-foreground' : ''}`}>{format(day, 'd')}</div>
                {isStart && <div className="text-[7px] font-bold text-green-600 uppercase">Start</div>}
                {isEnd && <div className="text-[7px] font-bold text-red-500 uppercase">End</div>}
              </div>
            );
          })}

          {HOURS.map(hour => (
            <div key={`row-${hour}`} className="contents">
              <div className="pr-1 text-right text-[9px] text-muted-foreground border-b border-border flex items-start justify-end pt-0.5" style={{ height: CELL_HEIGHT }}>
                {formatHour(hour)}
              </div>
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const events = template.scheduledEvents.filter(e => e.date === dateStr);
                const inRange = isInAcademicRange(day);

                return (
                  <div key={`${dateStr}-${hour}`} className={`relative border-b border-l border-border ${!inRange ? 'bg-muted/30' : ''}`} style={{ height: CELL_HEIGHT }}>
                    {events.filter(e => Math.floor(e.startHour) === hour).map(event => {
                      const block = template.blocks.find(b => b.id === event.blockId);
                      if (!block) return null;
                      const top = (event.startHour - hour) * CELL_HEIGHT;
                      const height = (event.endHour - event.startHour) * CELL_HEIGHT;

                      const statusBg: Record<string, string> = {
                        confirmed: 'hsl(145 60% 42% / 0.2)',
                        rejected: 'hsl(0 70% 55% / 0.2)',
                        'on-hold': 'hsl(42 90% 50% / 0.2)',
                        scheduled: `hsl(${block.color} / 0.2)`,
                      };
                      const statusBorder: Record<string, string> = {
                        confirmed: 'hsl(145 60% 42%)',
                        rejected: 'hsl(0 70% 55%)',
                        'on-hold': 'hsl(42 90% 50%)',
                        scheduled: `hsl(${block.color})`,
                      };

                      return (
                        <div
                          key={event.id}
                          className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-0.5 text-[9px] overflow-hidden"
                          style={{
                            top,
                            height: height - 1,
                            backgroundColor: statusBg[block.state] || statusBg.scheduled,
                            borderLeft: `3px solid ${statusBorder[block.state] || statusBorder.scheduled}`,
                          }}
                        >
                          <div className="font-semibold truncate">{block.name}</div>
                          <div className="text-muted-foreground text-[8px]">
                            {formatHour(event.startHour)} – {formatHour(event.endHour)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
