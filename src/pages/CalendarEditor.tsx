import { useState, useMemo, useRef, useCallback } from 'react';
import { useAcademicStore } from '@/store/useAcademicStore';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import {
  format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths,
  isSameDay, isSameMonth, isToday, getHours
} from 'date-fns';
import { GraduationCap, ChevronLeft, ChevronRight, Plus, ArrowLeft, Layers, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CALENDAR_LAYER_COLORS } from '@/types/academic';
import type { CalendarLayerType } from '@/types/academic';

type ViewMode = 'month' | 'week' | 'day';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7 AM to 8 PM
const CELL_HEIGHT = 48;

const CATEGORY_COLORS: Record<string, string> = {
  Meeting: 'bg-purple-100 text-purple-800 border-purple-300',
  'Committee Review': 'bg-indigo-100 text-indigo-800 border-indigo-300',
  AICTE: 'bg-red-100 text-red-800 border-red-300',
  Administration: 'bg-slate-100 text-slate-800 border-slate-300',
  Examination: 'bg-amber-100 text-amber-800 border-amber-300',
  Audit: 'bg-orange-100 text-orange-800 border-orange-300',
};

export default function CalendarEditor() {
  const store = useAcademicStore();
  const { signOut } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dragEvent, setDragEvent] = useState<{ eventId: string; templateId: string; origDate: string; origStart: number; origEnd: number } | null>(null);
  const [showConflict, setShowConflict] = useState<{ message: string } | null>(null);
  const [confirmMove, setConfirmMove] = useState<{ eventId: string; templateId: string; newDate: string; newStart: number; newEnd: number; name: string } | null>(null);

  // All visible events
  const visibleEvents = useMemo(() => {
    const items: any[] = [];
    for (const t of store.templates) {
      const layer = store.calendarLayers.find(l => l.id === t.layerId);
      if (t.layerId && !store.enabledLayerIds.includes(t.layerId)) continue;
      for (const ev of t.scheduledEvents) {
        const block = t.blocks.find(b => b.id === ev.blockId);
        if (!block) continue;
        items.push({
          ...ev,
          templateId: t.id,
          blockName: block.name,
          category: block.category,
          state: block.state,
          layerType: t.layerType,
          layerEntity: t.layerEntityName,
          layerColor: layer?.color || CALENDAR_LAYER_COLORS[t.layerType as CalendarLayerType] || '210 70% 60%',
          overrideable: block.overrideable !== false,
        });
      }
    }
    return items;
  }, [store.templates, store.calendarLayers, store.enabledLayerIds]);

  const navigate = (dir: number) => {
    if (viewMode === 'month') setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    else if (viewMode === 'week') setCurrentDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    else setCurrentDate(d => addDays(d, dir));
  };

  const goToday = () => setCurrentDate(new Date());

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12} ${ampm}`;
  };

  // MONTH VIEW
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // WEEK VIEW
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate]);

  const handleDropOnSlot = (date: string, hour: number, eventId: string, templateId: string) => {
    const ev = visibleEvents.find(e => e.id === eventId);
    if (!ev) return;

    const duration = ev.endHour - ev.startHour;
    const newEnd = hour + duration;

    // Check conflicts
    const conflicting = visibleEvents.find(e =>
      e.id !== eventId && e.date === date &&
      hour < e.endHour && newEnd > e.startHour && !e.overrideable
    );

    if (conflicting) {
      setShowConflict({ message: `Conflict detected with "${conflicting.blockName}". Choose another slot.` });
      return;
    }

    setConfirmMove({
      eventId, templateId,
      newDate: date,
      newStart: hour,
      newEnd,
      name: ev.blockName,
    });
  };

  const executeMove = () => {
    if (!confirmMove) return;
    // Find the template and update
    const template = store.templates.find(t => t.id === confirmMove.templateId);
    if (template) {
      const result = store.moveEvent(confirmMove.eventId, confirmMove.newDate, confirmMove.newStart, confirmMove.newEnd);
      if (result) {
        setShowConflict({ message: result });
      }
    }
    setConfirmMove(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30 flex-shrink-0">
        <div className="px-6 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-accent" />
            <span className="font-display font-bold text-lg">AcadFlow</span>
          </Link>

          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goToday} className="px-3 py-1 rounded-lg text-xs font-medium border border-border hover:bg-muted">Today</button>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
              <ChevronRight className="w-4 h-4" />
            </button>
            <h2 className="font-display font-semibold text-lg min-w-[180px] text-center">
              {viewMode === 'day'
                ? format(currentDate, 'EEEE, MMM d, yyyy')
                : viewMode === 'week'
                ? `${format(startOfWeek(currentDate), 'MMM d')} – ${format(endOfWeek(currentDate), 'MMM d, yyyy')}`
                : format(currentDate, 'MMMM yyyy')
              }
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode tabs */}
            <div className="flex bg-muted rounded-lg p-0.5">
              {(['month', 'week', 'day'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  className={cn(
                    "px-3 py-1 rounded-md text-xs font-medium transition-all capitalize",
                    viewMode === v ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <Link to="/dashboard" className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Layers + Legend */}
        <div className="w-52 flex-shrink-0 border-r border-border bg-card overflow-y-auto p-3 space-y-4">
          <div>
            <h4 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-2 flex items-center gap-1">
              <Layers className="w-3 h-3" /> Layers
            </h4>
            {store.calendarLayers.map(layer => (
              <label key={layer.id} className="flex items-center gap-2 py-1.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={store.enabledLayerIds.includes(layer.id)}
                  onChange={() => store.toggleLayer(layer.id)}
                  className="rounded border-border"
                />
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: `hsl(${layer.color})` }} />
                <span className="text-xs font-medium truncate">{layer.entityName}</span>
              </label>
            ))}
          </div>

          <div>
            <h4 className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider mb-2">Legend</h4>
            {Object.entries(CATEGORY_COLORS).map(([name, cls]) => (
              <div key={name} className="flex items-center gap-2 py-1">
                <div className={cn("w-3 h-3 rounded border", cls.split(' ').filter(c => c.startsWith('bg-') || c.startsWith('border-')).join(' '))} />
                <span className="text-xs">{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          {viewMode === 'month' && (
            <div className="p-4">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
                ))}
              </div>
              {/* Month grid */}
              <div className="grid grid-cols-7 border-t border-l border-border">
                {monthDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayEvents = visibleEvents.filter(e => e.date === dateStr);
                  const inMonth = isSameMonth(day, currentDate);
                  return (
                    <div
                      key={dateStr}
                      className={cn(
                        "min-h-[100px] border-r border-b border-border p-1.5 transition-colors cursor-pointer hover:bg-muted/30",
                        !inMonth && "bg-muted/20",
                        isToday(day) && "bg-accent/5"
                      )}
                      onClick={() => { setCurrentDate(day); setViewMode('day'); }}
                    >
                      <div className={cn(
                        "text-xs font-medium mb-1",
                        isToday(day) ? "text-accent font-bold" : inMonth ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map(ev => (
                          <div
                            key={ev.id}
                            className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium"
                            style={{
                              backgroundColor: `hsl(${ev.layerColor} / 0.15)`,
                              color: `hsl(${ev.layerColor})`,
                              borderLeft: `3px solid hsl(${ev.layerColor})`,
                            }}
                          >
                            {ev.blockName}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-muted-foreground pl-1">+{dayEvents.length - 3} more</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'week' && (
            <div className="flex flex-col h-full">
              {/* Day headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border sticky top-0 bg-card z-10">
                <div />
                {weekDays.map(day => (
                  <div key={day.toISOString()} className={cn(
                    "text-center py-2 border-l border-border",
                    isToday(day) && "bg-accent/5"
                  )}>
                    <div className="text-[10px] uppercase text-muted-foreground">{format(day, 'EEE')}</div>
                    <div className={cn("text-sm font-semibold", isToday(day) ? "text-accent" : "")}>
                      {format(day, 'd')}
                    </div>
                  </div>
                ))}
              </div>
              {/* Time grid */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                  {HOURS.map(hour => (
                    <div key={hour} className="contents">
                      <div className="h-12 text-[10px] text-muted-foreground text-right pr-2 pt-0.5 border-b border-border">
                        {formatHour(hour)}
                      </div>
                      {weekDays.map(day => {
                        const dateStr = format(day, 'yyyy-MM-dd');
                        const slotEvents = visibleEvents.filter(e =>
                          e.date === dateStr && e.startHour <= hour && e.endHour > hour
                        );
                        return (
                          <div
                            key={`${dateStr}-${hour}`}
                            className="h-12 border-l border-b border-border relative hover:bg-muted/20 cursor-pointer"
                            onClick={() => {
                              if (dragEvent) {
                                handleDropOnSlot(dateStr, hour, dragEvent.eventId, dragEvent.templateId);
                                setDragEvent(null);
                              }
                            }}
                          >
                            {slotEvents.filter(e => e.startHour === hour).map(ev => {
                              const height = (ev.endHour - ev.startHour) * CELL_HEIGHT;
                              return (
                                <div
                                  key={ev.id}
                                  className="absolute inset-x-0.5 z-10 rounded-md px-1.5 py-0.5 text-[10px] font-medium cursor-grab overflow-hidden"
                                  style={{
                                    height: `${height}px`,
                                    backgroundColor: `hsl(${ev.layerColor} / 0.15)`,
                                    borderLeft: `3px solid hsl(${ev.layerColor})`,
                                    color: `hsl(${ev.layerColor})`,
                                  }}
                                  draggable
                                  onDragStart={() => setDragEvent({
                                    eventId: ev.id, templateId: ev.templateId,
                                    origDate: ev.date, origStart: ev.startHour, origEnd: ev.endHour,
                                  })}
                                  onDragEnd={() => setDragEvent(null)}
                                >
                                  <div className="font-semibold truncate">{ev.blockName}</div>
                                  <div className="opacity-75">{formatHour(ev.startHour)} - {formatHour(ev.endHour)}</div>
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
          )}

          {viewMode === 'day' && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto">
                {HOURS.map(hour => {
                  const dateStr = format(currentDate, 'yyyy-MM-dd');
                  const slotEvents = visibleEvents.filter(e => e.date === dateStr && e.startHour === hour);
                  return (
                    <div key={hour} className="flex border-b border-border">
                      <div className="w-16 text-xs text-muted-foreground text-right pr-3 py-3 flex-shrink-0">
                        {formatHour(hour)}
                      </div>
                      <div className="flex-1 min-h-[60px] relative hover:bg-muted/20 p-1">
                        {slotEvents.map(ev => {
                          const height = (ev.endHour - ev.startHour) * 60;
                          return (
                            <div
                              key={ev.id}
                              className="rounded-lg px-3 py-2 mb-1 text-sm cursor-grab"
                              style={{
                                minHeight: `${height}px`,
                                backgroundColor: `hsl(${ev.layerColor} / 0.12)`,
                                borderLeft: `4px solid hsl(${ev.layerColor})`,
                              }}
                              draggable
                              onDragStart={() => setDragEvent({
                                eventId: ev.id, templateId: ev.templateId,
                                origDate: ev.date, origStart: ev.startHour, origEnd: ev.endHour,
                              })}
                            >
                              <div className="font-semibold" style={{ color: `hsl(${ev.layerColor})` }}>{ev.blockName}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatHour(ev.startHour)} – {formatHour(ev.endHour)}
                                {ev.layerEntity && <span className="ml-2">• {ev.layerEntity}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirm Move Dialog */}
      {confirmMove && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="font-display font-semibold text-lg mb-3">Move "{confirmMove.name}"?</h3>
            <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1 mb-4">
              <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{format(parseISO(confirmMove.newDate), 'MMM d, yyyy')}</span></div>
              <div><span className="text-muted-foreground">Time:</span> <span className="font-medium">{formatHour(confirmMove.newStart)} – {formatHour(confirmMove.newEnd)}</span></div>
            </div>
            <div className="flex gap-2">
              <button onClick={executeMove} className="flex-1 h-10 rounded-xl bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90">
                Confirm Move
              </button>
              <button onClick={() => setConfirmMove(null)} className="flex-1 h-10 rounded-xl border border-border font-medium text-sm hover:bg-muted">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Alert */}
      {showConflict && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center gap-2 mb-3 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-display font-semibold">Conflict Detected</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{showConflict.message}</p>
            <button onClick={() => setShowConflict(null)} className="w-full h-10 rounded-xl border border-border font-medium text-sm hover:bg-muted">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
