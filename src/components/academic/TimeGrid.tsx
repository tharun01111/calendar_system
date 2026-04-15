import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useAcademicStore } from '@/store/useAcademicStore';
import {
  format, startOfWeek, addDays, subWeeks, addWeeks, parseISO, isSameDay,
  setMonth, setYear, startOfMonth, isWithinInterval,
} from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarDays, ArrowRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const CELL_HEIGHT = 56;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const currentYear = new Date().getFullYear();
const FUTURE_YEARS = Array.from({ length: 6 }, (_, i) => currentYear + i);

export function TimeGrid() {
  const store = useAcademicStore();
  const template = store.getActiveTemplate();
  const selectedBlockId = store.selectedBlockId;
  const enabledLayerIds = store.enabledLayerIds;
  const calendarLayers = store.calendarLayers;
  const allTemplates = store.templates;

  const initialDate = useMemo(() => {
    if (template?.academicStartDate) return parseISO(template.academicStartDate);
    return new Date();
  }, [template?.academicStartDate]);

  const [weekStart, setWeekStart] = useState(() =>
    startOfWeek(initialDate, { weekStartsOn: 1 })
  );
  const [showNavPicker, setShowNavPicker] = useState(false);
  const navPickerRef = useRef<HTMLDivElement>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{
    eventId: string;
    blockId: string;
    blockName: string;
    originalDate: string;
    originalStartHour: number;
    originalEndHour: number;
    templateId?: string;
  } | null>(null);
  const [dragPreview, setDragPreview] = useState<{ date: string; startHour: number; endHour: number } | null>(null);
  const [dragConflict, setDragConflict] = useState<string | null>(null);

  const [resizing, setResizing] = useState<{
    eventId: string;
    blockName: string;
    blockId: string;
    date: string;
    startHour: number;
    originalEndHour: number;
  } | null>(null);
  const [resizePreviewEnd, setResizePreviewEnd] = useState<number | null>(null);

  const [pendingSchedule, setPendingSchedule] = useState<{
    blockId: string;
    blockName: string;
    date: string;
    startHour: number;
    endHour: number;
  } | null>(null);

  const [pendingMove, setPendingMove] = useState<{
    eventId: string;
    blockName: string;
    date: string;
    startHour: number;
    endHour: number;
  } | null>(null);

  const [pendingResize, setPendingResize] = useState<{
    eventId: string;
    blockName: string;
    date: string;
    startHour: number;
    endHour: number;
  } | null>(null);

  const days = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Click outside to close nav picker
  useEffect(() => {
    if (!showNavPicker) return;
    const handler = (e: MouseEvent) => {
      if (navPickerRef.current && !navPickerRef.current.contains(e.target as Node)) {
        setShowNavPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showNavPicker]);

  // Collect ALL visible events from enabled layers + active template
  const visibleEventsForWeek = useMemo(() => {
    const results: { eventId: string; blockId: string; date: string; startHour: number; endHour: number; blockName: string; blockColor: string; blockState: string; layerColor?: string; layerName?: string; templateName: string; isActiveTemplate: boolean; overrideable: boolean; templateId: string }[] = [];

    for (const t of allTemplates) {
      const layer = t.layerId ? calendarLayers.find(l => l.id === t.layerId) : undefined;
      if (layer && !enabledLayerIds.includes(layer.id) && t.id !== template?.id) continue;

      const isActive = t.id === template?.id;

      for (const ev of t.scheduledEvents) {
        const eventDate = parseISO(ev.date);
        if (!days.some(d => isSameDay(d, eventDate))) continue;

        const block = t.blocks.find(b => b.id === ev.blockId);
        if (!block) continue;

        results.push({
          eventId: ev.id,
          blockId: block.id,
          date: ev.date,
          startHour: ev.startHour,
          endHour: ev.endHour,
          blockName: block.name,
          blockColor: block.color,
          blockState: block.state,
          layerColor: layer?.color,
          layerName: layer ? layer.entityName : undefined,
          templateName: t.name,
          isActiveTemplate: isActive,
          overrideable: block.overrideable !== false,
          templateId: t.id,
        });
      }
    }

    return results;
  }, [allTemplates, calendarLayers, enabledLayerIds, days, template?.id]);

  const academicRange = useMemo(() => {
    if (!template) return null;
    return {
      start: parseISO(template.academicStartDate),
      end: parseISO(template.academicEndDate),
    };
  }, [template?.academicStartDate, template?.academicEndDate]);

  const isInAcademicRange = useCallback((day: Date) => {
    if (!academicRange) return true;
    return isWithinInterval(day, { start: academicRange.start, end: academicRange.end });
  }, [academicRange]);

  const getCellFromMouse = useCallback((clientX: number, clientY: number): { date: string; hour: number } | null => {
    if (!gridRef.current) return null;
    const grid = gridRef.current;
    const rect = grid.getBoundingClientRect();
    const scrollTop = grid.scrollTop;
    const x = clientX - rect.left;
    const y = clientY - rect.top + scrollTop;

    const colWidth = (rect.width - 56) / 7;
    const colIndex = Math.floor((x - 56) / colWidth);
    if (colIndex < 0 || colIndex > 6) return null;

    const headerHeight = 44;
    const rowIndex = Math.floor((y - headerHeight) / CELL_HEIGHT);
    if (rowIndex < 0 || rowIndex >= HOURS.length) return null;

    const day = days[colIndex];
    if (!day) return null;
    return { date: format(day, 'yyyy-MM-dd'), hour: HOURS[rowIndex] };
  }, [days]);

  // Cross-layer conflict check for drag
  const checkCrossLayerConflict = useCallback((
    currentEventId: string,
    targetDate: string,
    startHour: number,
    endHour: number,
  ): string | null => {
    // Check against ALL visible events (cross-layer)
    for (const ev of visibleEventsForWeek) {
      if (ev.eventId === currentEventId) continue;
      if (ev.date !== targetDate) continue;
      if (startHour < ev.endHour && endHour > ev.startHour) {
        if (!ev.overrideable) {
          return `🚫 Non-overrideable conflict with "${ev.blockName}" (${ev.layerName || ev.templateName})`;
        }
        return `⚠️ Overlaps with "${ev.blockName}" (${ev.layerName || ev.templateName})`;
      }
    }

    // Check academic range
    if (academicRange) {
      const dayDate = parseISO(targetDate);
      if (!isWithinInterval(dayDate, { start: academicRange.start, end: academicRange.end })) {
        return '📅 Outside academic date range';
      }
    }
    return null;
  }, [visibleEventsForWeek, academicRange]);

  useEffect(() => {
    if (!dragging) return;
    const handleMouseMove = (e: MouseEvent) => {
      const cell = getCellFromMouse(e.clientX, e.clientY);
      if (!cell) return;
      const duration = dragging.originalEndHour - dragging.originalStartHour;
      const newEnd = cell.hour + duration;
      setDragPreview({ date: cell.date, startHour: cell.hour, endHour: newEnd });
      const conflict = checkCrossLayerConflict(dragging.eventId, cell.date, cell.hour, newEnd);
      setDragConflict(conflict);
    };
    const handleMouseUp = () => {
      if (dragPreview && !dragConflict) {
        setPendingMove({
          eventId: dragging.eventId,
          blockName: dragging.blockName,
          date: dragPreview.date,
          startHour: dragPreview.startHour,
          endHour: dragPreview.endHour,
        });
      } else if (dragConflict) {
        toast.error(dragConflict);
      }
      setDragging(null);
      setDragPreview(null);
      setDragConflict(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, dragPreview, dragConflict, checkCrossLayerConflict, getCellFromMouse]);

  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const cell = getCellFromMouse(e.clientX, e.clientY);
      if (!cell || cell.date !== resizing.date) return;
      const newEnd = Math.max(resizing.startHour + 1, cell.hour + 1);
      setResizePreviewEnd(newEnd);
    };
    const handleMouseUp = () => {
      if (resizePreviewEnd && resizePreviewEnd !== resizing.originalEndHour) {
        // Check conflict for resize
        const conflict = checkCrossLayerConflict(resizing.eventId, resizing.date, resizing.startHour, resizePreviewEnd);
        if (conflict && conflict.startsWith('🚫')) {
          toast.error(conflict);
        } else {
          setPendingResize({
            eventId: resizing.eventId,
            blockName: resizing.blockName,
            date: resizing.date,
            startHour: resizing.startHour,
            endHour: resizePreviewEnd,
          });
        }
      }
      setResizing(null);
      setResizePreviewEnd(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, resizePreviewEnd, getCellFromMouse, checkCrossLayerConflict]);

  const handleSlotClick = useCallback((day: Date, hour: number) => {
    if (dragging || resizing) return;
    if (!selectedBlockId || !template) {
      if (!selectedBlockId) toast.info('Select a block on the canvas first');
      return;
    }
    const block = template.blocks.find(b => b.id === selectedBlockId);
    if (!block) return;
    if (block.locked) {
      toast.error('Cannot schedule start/end blocks');
      return;
    }
    if (block.state !== 'unscheduled') {
      toast.error(`${block.name} is already scheduled.`);
      return;
    }
    if (!isInAcademicRange(day)) {
      toast.error('Activity must be scheduled between Academic Start and End dates.');
      return;
    }
    const dateStr = format(day, 'yyyy-MM-dd');
    const endHour = hour + block.duration;

    // Check cross-layer conflict before showing confirm
    const conflict = checkCrossLayerConflict('', dateStr, hour, endHour);
    if (conflict && conflict.startsWith('🚫')) {
      toast.error(conflict);
      return;
    }

    setPendingSchedule({
      blockId: block.id,
      blockName: block.name,
      date: dateStr,
      startHour: hour,
      endHour,
    });
  }, [selectedBlockId, template, dragging, resizing, isInAcademicRange, checkCrossLayerConflict]);

  const confirmSchedule = useCallback(() => {
    if (!pendingSchedule) return;
    const error = store.scheduleBlock(
      pendingSchedule.blockId,
      pendingSchedule.date,
      pendingSchedule.startHour,
      pendingSchedule.endHour
    );
    if (error) toast.error(error);
    else {
      toast.success(`Scheduled ${pendingSchedule.blockName}`);
      store.setSelectedBlockId(null);
    }
    setPendingSchedule(null);
  }, [pendingSchedule, store]);

  const confirmMove = useCallback(() => {
    if (!pendingMove) return;
    const error = store.moveEvent(
      pendingMove.eventId,
      pendingMove.date,
      pendingMove.startHour,
      pendingMove.endHour
    );
    if (error) toast.error(error);
    else toast.success(`Moved ${pendingMove.blockName}`);
    setPendingMove(null);
  }, [pendingMove, store]);

  const confirmResize = useCallback(() => {
    if (!pendingResize) return;
    const error = store.moveEvent(
      pendingResize.eventId,
      pendingResize.date,
      pendingResize.startHour,
      pendingResize.endHour
    );
    if (error) toast.error(error);
    else toast.success(`Resized ${pendingResize.blockName}`);
    setPendingResize(null);
  }, [pendingResize, store]);

  const handleDragStart = useCallback((e: React.MouseEvent, eventId: string, blockId: string, blockName: string, date: string, startHour: number, endHour: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging({ eventId, blockId, blockName, originalDate: date, originalStartHour: startHour, originalEndHour: endHour });
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent, eventId: string, blockName: string, blockId: string, date: string, startHour: number, endHour: number) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({ eventId, blockName, blockId, date, startHour, originalEndHour: endHour });
    setResizePreviewEnd(endHour);
  }, []);

  const jumpToWeek = useCallback((date: Date) => {
    setWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
    setShowNavPicker(false);
  }, []);

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour12} ${ampm}`;
  };

  const currentNavMonth = weekStart.getMonth();
  const currentNavYear = weekStart.getFullYear();

  // Detect overlapping events per cell for visual offset
  const getOverlapIndex = useCallback((eventId: string, date: string, startHour: number, endHour: number): { index: number; total: number } => {
    const overlapping = visibleEventsForWeek.filter(ev =>
      ev.date === date && ev.startHour < endHour && ev.endHour > startHour
    );
    const idx = overlapping.findIndex(ev => ev.eventId === eventId);
    return { index: Math.max(0, idx), total: overlapping.length };
  }, [visibleEventsForWeek]);

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card flex-shrink-0">
        <button
          onClick={() => setWeekStart(s => startOfWeek(subWeeks(s, 1), { weekStartsOn: 1 }))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="relative" ref={navPickerRef}>
          <button
            onClick={() => setShowNavPicker(!showNavPicker)}
            className="flex items-center gap-1.5 text-sm font-medium font-display hover:text-accent transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" />
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
                    className={`px-2 py-1.5 rounded-md text-xs transition-colors ${
                      i === currentNavMonth ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted'
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
                    className={`px-2 py-1.5 rounded-md text-xs transition-colors ${
                      y === currentNavYear ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>

              <div className="border-t border-border pt-2 space-y-0.5">
                <button
                  onClick={() => jumpToWeek(new Date())}
                  className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors flex items-center gap-1.5 font-medium"
                >
                  <ArrowRight className="w-3 h-3" /> Jump to Today
                </button>
                {template && (
                  <>
                    <button
                      onClick={() => jumpToWeek(parseISO(template.academicStartDate))}
                      className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                    >
                      <ArrowRight className="w-3 h-3" /> Academic Start
                    </button>
                    <button
                      onClick={() => jumpToWeek(parseISO(template.academicEndDate))}
                      className="w-full text-left px-2 py-1.5 rounded-md text-xs hover:bg-muted transition-colors flex items-center gap-1.5"
                    >
                      <ArrowRight className="w-3 h-3" /> Academic End
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => setWeekStart(s => startOfWeek(addWeeks(s, 1), { weekStartsOn: 1 }))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Selected block indicator */}
      {selectedBlockId && template && !dragging && (
        <div className="px-4 py-1.5 bg-accent/8 border-b border-accent/20 flex-shrink-0">
          <span className="text-xs text-accent font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse-soft" />
            Click a time slot to schedule: {template.blocks.find(b => b.id === selectedBlockId)?.name}
          </span>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-auto" ref={gridRef}>
        <div className="grid" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
          {/* Day headers */}
          <div className="sticky top-0 z-10 bg-card border-b border-border" style={{ height: 44 }} />
          {days.map(day => {
            const inRange = isInAcademicRange(day);
            const dateStr = format(day, 'yyyy-MM-dd');
            const isStart = template?.academicStartDate === dateStr;
            const isEnd = template?.academicEndDate === dateStr;
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`sticky top-0 z-10 border-b border-l border-border px-2 py-1.5 text-center transition-colors ${
                  isToday ? 'bg-accent/5' : inRange ? 'bg-card' : 'bg-muted/40'
                } ${isStart ? 'ring-inset ring-1 ring-green-400/40' : ''} ${isEnd ? 'ring-inset ring-1 ring-red-400/40' : ''}`}
                style={{ height: 44 }}
              >
                <div className="text-[10px] uppercase text-muted-foreground tracking-wider">
                  {format(day, 'EEE')}
                </div>
                <div className={`text-sm font-semibold font-display ${
                  isToday ? 'text-accent' : !inRange ? 'text-muted-foreground' : ''
                }`}>
                  {format(day, 'd')}
                </div>
                {isStart && <div className="text-[7px] font-bold text-green-600 uppercase leading-none">Start</div>}
                {isEnd && <div className="text-[7px] font-bold text-red-500 uppercase leading-none">End</div>}
              </div>
            );
          })}

          {/* Hour rows */}
          {HOURS.map(hour => (
            <div key={`row-${hour}`} className="contents">
              <div
                className="pr-2 text-right text-[10px] text-muted-foreground border-b border-border flex items-start justify-end pt-1"
                style={{ height: CELL_HEIGHT }}
              >
                {formatHour(hour)}
              </div>
              {days.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const cellEvents = visibleEventsForWeek.filter(e => e.date === dateStr);
                const inRange = isInAcademicRange(day);

                const showDragGhost = dragging && dragPreview && dragPreview.date === dateStr && Math.floor(dragPreview.startHour) === hour;

                return (
                  <div
                    key={`${dateStr}-${hour}`}
                    className={`relative border-b border-l border-border transition-colors ${
                      !inRange
                        ? 'bg-muted/20 cursor-not-allowed'
                        : dragging
                          ? 'cursor-crosshair hover:bg-accent/5'
                          : 'cursor-pointer hover:bg-accent/5'
                    }`}
                    style={{ height: CELL_HEIGHT }}
                    onClick={() => !dragging && !resizing && handleSlotClick(day, hour)}
                  >
                    {/* Drag ghost preview */}
                    {showDragGhost && dragPreview && (
                      <div
                        className={`absolute left-0.5 right-0.5 rounded-lg px-2 py-1 text-xs z-[8] pointer-events-none border-2 border-dashed transition-colors ${
                          dragConflict ? 'border-destructive bg-destructive/10' : 'border-accent bg-accent/10'
                        }`}
                        style={{
                          top: (dragPreview.startHour - hour) * CELL_HEIGHT,
                          height: (dragPreview.endHour - dragPreview.startHour) * CELL_HEIGHT - 2,
                        }}
                      >
                        <div className="font-semibold truncate">{dragging.blockName}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {formatHour(dragPreview.startHour)} – {formatHour(dragPreview.endHour)}
                        </div>
                        {dragConflict && (
                          <div className="text-[9px] text-destructive font-medium mt-0.5 flex items-center gap-0.5">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            Conflict
                          </div>
                        )}
                      </div>
                    )}

                    {cellEvents
                      .filter(e => Math.floor(e.startHour) === hour)
                      .map(ev => {
                        const topOffset = (ev.startHour - hour) * CELL_HEIGHT;
                        const isDraggingThis = dragging?.eventId === ev.eventId;
                        const isResizingThis = resizing?.eventId === ev.eventId;
                        const displayEnd = isResizingThis && resizePreviewEnd ? resizePreviewEnd : ev.endHour;
                        const height = (displayEnd - ev.startHour) * CELL_HEIGHT;

                        // Overlap positioning
                        const { index: overlapIdx, total: overlapTotal } = getOverlapIndex(ev.eventId, ev.date, ev.startHour, ev.endHour);
                        const widthPercent = overlapTotal > 1 ? (100 / overlapTotal) - 1 : 100;
                        const leftPercent = overlapTotal > 1 ? (overlapIdx * (100 / overlapTotal)) + 1 : 0;

                        const borderColor = ev.layerColor
                          ? `hsl(${ev.layerColor})`
                          : `hsl(${ev.blockColor})`;
                        const bgColor = ev.layerColor
                          ? `hsl(${ev.layerColor} / 0.12)`
                          : `hsl(${ev.blockColor} / 0.18)`;

                        const canDrag = ev.isActiveTemplate;

                        return (
                          <div
                            key={ev.eventId}
                            className={`absolute rounded-lg overflow-hidden z-[5] select-none transition-all duration-150 ${
                              isDraggingThis ? 'opacity-30 scale-95' : canDrag ? 'cursor-grab hover:shadow-card-hover hover:z-[6]' : 'cursor-default'
                            } ${!ev.overrideable ? 'ring-1 ring-destructive/30' : ''}`}
                            style={{
                              top: topOffset,
                              height: Math.max(height - 2, 20),
                              left: `${leftPercent + 1}%`,
                              width: `${widthPercent - 1}%`,
                              backgroundColor: bgColor,
                              borderLeftWidth: 3,
                              borderLeftColor: borderColor,
                            }}
                            onMouseDown={canDrag
                              ? (e) => handleDragStart(e, ev.eventId, ev.blockId, ev.blockName, ev.date, ev.startHour, ev.endHour)
                              : undefined}
                            title={`${ev.blockName}${ev.layerName ? ` · ${ev.layerName}` : ''}\n${ev.templateName}\n${formatHour(ev.startHour)} – ${formatHour(ev.endHour)}`}
                          >
                            <div className="px-1.5 py-0.5">
                              <div className="font-semibold truncate text-[11px] leading-tight">{ev.blockName}</div>
                              {ev.layerName && (
                                <div className="text-[8px] text-muted-foreground truncate flex items-center gap-0.5 mt-0.5">
                                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: borderColor }} />
                                  {ev.layerName} · {ev.templateName}
                                </div>
                              )}
                              <div className="text-muted-foreground text-[9px]">
                                {formatHour(ev.startHour)} – {formatHour(displayEnd)}
                              </div>
                              {!ev.overrideable && (
                                <div className="text-[8px] text-destructive font-medium">🔒 Protected</div>
                              )}
                            </div>
                            {/* Resize handle */}
                            {canDrag && (
                              <div
                                className="absolute bottom-0 left-0 right-0 h-3 cursor-s-resize bg-gradient-to-t from-foreground/5 to-transparent hover:from-foreground/15 rounded-b-lg flex items-center justify-center"
                                onMouseDown={(e) => handleResizeStart(e, ev.eventId, ev.blockName, ev.blockId, ev.date, ev.startHour, ev.endHour)}
                              >
                                <div className="w-5 h-0.5 bg-foreground/20 rounded-full" />
                              </div>
                            )}
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

      {/* Confirmation Dialogs */}
      {pendingSchedule && (
        <ConfirmDialog
          title="Confirm Schedule"
          message={`Schedule "${pendingSchedule.blockName}" on ${format(parseISO(pendingSchedule.date), 'EEE, MMM d, yyyy')} from ${formatHour(pendingSchedule.startHour)} to ${formatHour(pendingSchedule.endHour)}?`}
          onConfirm={confirmSchedule}
          onCancel={() => setPendingSchedule(null)}
          confirmLabel="Schedule"
        />
      )}

      {pendingMove && (
        <ConfirmDialog
          title="Confirm Move"
          message={`Move "${pendingMove.blockName}" to ${format(parseISO(pendingMove.date), 'EEE, MMM d, yyyy')} from ${formatHour(pendingMove.startHour)} to ${formatHour(pendingMove.endHour)}?`}
          onConfirm={confirmMove}
          onCancel={() => setPendingMove(null)}
          confirmLabel="Move"
        />
      )}

      {pendingResize && (
        <ConfirmDialog
          title="Resize Event"
          message={`Resize "${pendingResize.blockName}" to ${formatHour(pendingResize.startHour)} – ${formatHour(pendingResize.endHour)} on ${format(parseISO(pendingResize.date), 'EEE, MMM d, yyyy')}?`}
          onConfirm={confirmResize}
          onCancel={() => setPendingResize(null)}
          confirmLabel="Resize"
        />
      )}
    </div>
  );
}

function ConfirmDialog({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm' }: {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in" onClick={onCancel}>
      <div className="bg-card rounded-xl shadow-elevated border border-border p-5 max-w-sm w-full mx-4 animate-slide-in" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-semibold font-display mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-muted transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
