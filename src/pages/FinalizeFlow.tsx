import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useAcademicStore } from '@/store/useAcademicStore';
import {
  format, parseISO, addDays, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isToday, addMonths, subMonths, addWeeks, subWeeks, isSameDay
} from 'date-fns';
import { GraduationCap, ArrowLeft, ChevronLeft, ChevronRight, Check, Clock, ArrowRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type FlowTemplate = {
  id: string;
  name: string;
  description: string | null;
  applicable_to: string[];
};

type FlowActivity = {
  id: string;
  name: string;
  stage: string | null;
  duration_days: number;
  sequence_order: number;
};

type GeneratedEvent = {
  activityId: string;
  name: string;
  stage: string | null;
  date: string;
  endDate: string;
  duration: number;
  status: 'pending' | 'confirmed' | 'skipped';
};

type Ruleset = 'aicte' | 'naac' | 'nba' | 'anna-university' | 'custom';

const RULESETS: { id: Ruleset; name: string; description: string }[] = [
  { id: 'aicte', name: 'AICTE', description: 'All India Council for Technical Education guidelines' },
  { id: 'naac', name: 'NAAC', description: 'National Assessment and Accreditation Council standards' },
  { id: 'nba', name: 'NBA', description: 'National Board of Accreditation framework' },
  { id: 'anna-university', name: 'Anna University', description: 'Anna University academic regulations' },
  { id: 'custom', name: 'Custom Institutional Rules', description: 'Define your own scheduling constraints' },
];

const RULE_DEFAULTS: Record<Ruleset, { minMeetingGap: number; minExamGap: number; auditPrepBuffer: number; holidayBuffer: number }> = {
  aicte: { minMeetingGap: 14, minExamGap: 21, auditPrepBuffer: 45, holidayBuffer: 7 },
  naac: { minMeetingGap: 14, minExamGap: 21, auditPrepBuffer: 45, holidayBuffer: 7 },
  nba: { minMeetingGap: 14, minExamGap: 21, auditPrepBuffer: 60, holidayBuffer: 7 },
  'anna-university': { minMeetingGap: 7, minExamGap: 14, auditPrepBuffer: 30, holidayBuffer: 5 },
  custom: { minMeetingGap: 7, minExamGap: 14, auditPrepBuffer: 30, holidayBuffer: 7 },
};

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Governance: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  Quality: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  Examination: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  Administration: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  Audit: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  Meeting: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  Placements: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
};

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const CELL_HEIGHT = 56;

type ViewMode = 'monthly' | 'weekly';

export default function FinalizeFlow() {
  const { flowId } = useParams<{ flowId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Step management
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 state
  const [flow, setFlow] = useState<FlowTemplate | null>(null);
  const [activities, setActivities] = useState<FlowActivity[]>([]);
  const [selectedRulesets, setSelectedRulesets] = useState<Ruleset[]>([]);
  const [startDate, setStartDate] = useState<Date>();
  const [loading, setLoading] = useState(true);

  // Step 2 state
  const [events, setEvents] = useState<GeneratedEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [finalizing, setFinalizing] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch flow data
  useEffect(() => {
    if (!flowId) return;
    (async () => {
      const { data: flowData } = await supabase.from('flow_templates').select('*').eq('id', flowId).single();
      if (flowData) setFlow(flowData as FlowTemplate);
      const { data: actData } = await supabase.from('flow_activities').select('*').eq('flow_template_id', flowId).order('sequence_order');
      
      let finalActivities = actData ? (actData as FlowActivity[]) : [];

      if (finalActivities.length === 0 && flowData) {
        // Fallback to local store if blocks weren't synced to Supabase (user's local flow builder)
        const store = useAcademicStore.getState();
        const localTemplate = store.templates.find(t => t.name === flowData.name);
        if (localTemplate) {
          finalActivities = localTemplate.blocks
            .filter(b => !b.locked && b.active)
            .map((b, idx) => ({
              id: b.id,
              name: b.name,
              stage: b.category || null,
              duration_days: b.duration ? Math.ceil(b.duration / 24) : 1,
              sequence_order: idx
            }));
            
          // We must sync these localized activities to Supabase so that the final 'generated_calendar_events'
          // has valid foreign keys mapping to 'flow_activities' id.
          if (finalActivities.length > 0) {
            const inserts = finalActivities.map(a => ({
              id: a.id,
              flow_template_id: flowId,
              name: a.name,
              stage: a.stage,
              duration_days: a.duration_days,
              sequence_order: a.sequence_order
            }));
            await supabase.from('flow_activities').upsert(inserts);
          }
        }
      }

      setActivities(finalActivities);
      setLoading(false);
    })();
  }, [flowId]);

  // Merged rules
  const mergedRules = useMemo(() => {
    if (selectedRulesets.length === 0) return null;
    return selectedRulesets.reduce(
      (m, rid) => {
        const r = RULE_DEFAULTS[rid];
        return {
          minMeetingGap: Math.max(m.minMeetingGap, r.minMeetingGap),
          minExamGap: Math.max(m.minExamGap, r.minExamGap),
          auditPrepBuffer: Math.max(m.auditPrepBuffer, r.auditPrepBuffer),
          holidayBuffer: Math.max(m.holidayBuffer, r.holidayBuffer),
        };
      },
      { minMeetingGap: 0, minExamGap: 0, auditPrepBuffer: 0, holidayBuffer: 0 }
    );
  }, [selectedRulesets]);

  // Compute end date
  const computedEndDate = useMemo(() => {
    if (!startDate || activities.length === 0) return null;
    const totalDays = activities.reduce((s, a) => s + a.duration_days, 0);
    const bufferDays = mergedRules ? mergedRules.holidayBuffer * (activities.length - 1) : 0;
    return addDays(startDate, totalDays + bufferDays);
  }, [startDate, activities, mergedRules]);

  const toggleRuleset = (id: Ruleset) => {
    setSelectedRulesets(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
  };

  // Generate events and move to step 2
  const handleProceedToConfirmation = () => {
    if (!startDate || activities.length === 0 || selectedRulesets.length === 0) return;
    const gap = mergedRules?.holidayBuffer || 0;
    const generated: GeneratedEvent[] = [];
    let currentDate = startDate;

    for (const activity of activities) {
      const eventStart = format(currentDate, 'yyyy-MM-dd');
      const eventEnd = format(addDays(currentDate, activity.duration_days - 1), 'yyyy-MM-dd');
      generated.push({
        activityId: activity.id,
        name: activity.name,
        stage: activity.stage,
        date: eventStart,
        endDate: eventEnd,
        duration: activity.duration_days,
        status: 'pending',
      });
      currentDate = addDays(currentDate, activity.duration_days + gap);
    }

    setEvents(generated);
    setCalendarDate(startDate);
    setCalendarMonth(startDate);
    setCurrentIndex(0);
    setStep(2);
    window.scrollTo(0, 0);
  };

  // Step 2 helpers
  const confirmedCount = events.filter(e => e.status === 'confirmed').length;
  const progress = events.length > 0 ? (confirmedCount / events.length) * 100 : 0;
  const currentEvent = events[currentIndex];

  const checkCollision = (targetDate: string, duration: number, stage: string | null) => {
    if (!currentEvent) return null;
    const start1 = parseISO(targetDate).getTime();
    const end1 = addDays(parseISO(targetDate), duration - 1).getTime();
    
    for (const ev of events) {
      if (ev.status === 'confirmed' && ev.activityId !== currentEvent.activityId) {
        // Prevent overlap if either event is critical (e.g., Examination, Audit)
        const isCritical1 = stage === 'Examination' || stage === 'Audit';
        const isCritical2 = ev.stage === 'Examination' || ev.stage === 'Audit';
        
        if (isCritical1 || isCritical2) {
          const start2 = parseISO(ev.date).getTime();
          const end2 = parseISO(ev.endDate).getTime();
          if (start1 <= end2 && start2 <= end1) {
            return ev;
          }
        }
      }
    }
    return null;
  };

  const handleAnswer = (status: 'confirmed' | 'skipped') => {
    if (status === 'confirmed' && currentEvent) {
      const collision = checkCollision(currentEvent.date, currentEvent.duration, currentEvent.stage);
      if (collision) {
        toast.error(`Scheduling Conflict: Cannot overlap with ${collision.name}.`);
        return;
      }
    }
    setEvents(prev => prev.map((e, i) => i === currentIndex ? { ...e, status } : e));
    if (currentIndex < events.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 250);
    }
  };

  const handleCalendarDateClick = (date: Date | undefined) => {
    if (!date) return;
    setCalendarDate(date);
    if (viewMode === 'monthly') {
      const key = format(date, 'yyyy-MM-dd');
      dayRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleTimelineDateClick = (dateStr: string) => {
    if (!currentEvent || currentEvent.status === 'confirmed') return;
    
    const collision = checkCollision(dateStr, currentEvent.duration, currentEvent.stage);
    if (collision) {
      toast.error(`Scheduling Conflict: Cannot overlap with ${collision.name}.`);
      return;
    }

    // Reschedule current event to clicked date
    setEvents(prev => prev.map((e, i) => {
      if (i !== currentIndex) return e;
      const newEnd = format(addDays(parseISO(dateStr), e.duration - 1), 'yyyy-MM-dd');
      return { ...e, date: dateStr, endDate: newEnd, status: 'confirmed' };
    }));
    if (currentIndex < events.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 250);
    }
  };

  const navigateCalendar = (dir: number) => {
    if (viewMode === 'monthly') {
      setCalendarDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1));
    } else {
      setCalendarDate(d => dir > 0 ? addWeeks(d, 1) : subWeeks(d, 1));
    }
  };

  // Timeline days
  const timelineDays = useMemo(() => {
    const start = startOfMonth(calendarDate);
    const end = endOfMonth(calendarDate);
    return eachDayOfInterval({ start, end });
  }, [calendarDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(calendarDate);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [calendarDate]);

  const eventDates = useMemo(() => events.map(e => parseISO(e.date)), [events]);

  const formatHourShort = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${h12} ${ampm}`;
  };

  // Pagination
  const PAGE_SIZE = 9;
  const currentPage = Math.floor(currentIndex / PAGE_SIZE);
  const visibleRange = {
    start: currentPage * PAGE_SIZE,
    end: Math.min((currentPage + 1) * PAGE_SIZE, events.length),
  };

  // Finalize
  const handleFinalize = async () => {
    if (!flow || !user || !startDate) return;
    setFinalizing(true);
    const { data: calendar, error } = await supabase
      .from('generated_calendars')
      .insert({
        flow_template_id: flow.id,
        target_type: (flow.applicable_to?.[0] || 'institution') as any,
        start_date: format(startDate, 'yyyy-MM-dd'),
        status: 'finalized',
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !calendar) {
      toast.error('Failed to finalize calendar');
      setFinalizing(false);
      return;
    }

    const eventInserts = events.filter(e => e.status === 'confirmed').map(ev => ({
      generated_calendar_id: calendar.id,
      activity_id: ev.activityId,
      scheduled_date: ev.date,
      end_date: ev.endDate,
      status: 'confirmed',
    }));

    const { error: evError } = await supabase.from('generated_calendar_events').insert(eventInserts);
    if (evError) {
      toast.error('Failed to save events');
    } else {
      toast.success('Calendar finalized!');
      navigate('/final-calendar');
    }
    setFinalizing(false);
  };

  const allConfirmed = events.length > 0 && events.every(e => e.status !== 'pending');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading flow...</div>
      </div>
    );
  }

  if (!flow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="text-4xl">❌</div>
          <h3 className="font-display font-semibold">Flow not found</h3>
          <Link to="/dashboard" className="text-sm text-accent hover:underline">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  // ============ STEP 1: RULESET SELECTION ============
  if (step === 1) {
    const isValid = startDate && selectedRulesets.length > 0 && activities.length > 0;
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-accent" />
              <span className="font-display font-bold text-lg">AcadFlow</span>
            </Link>
            <Link to="/dashboard" className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-6 py-10">
          <div className="text-center mb-8">
            <div className="text-[10px] uppercase tracking-widest text-accent font-semibold mb-1">Step 1 of 2</div>
            <h1 className="text-2xl font-display font-bold text-foreground">Configure Scheduling Rules</h1>
            <p className="text-muted-foreground text-sm mt-1">for <span className="font-semibold text-foreground">{flow.name}</span></p>
          </div>

          <div className="bg-card rounded-2xl border border-border p-8 space-y-8 shadow-sm">
            {/* Start date */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Start Date</h3>
              <Popover>
                <PopoverTrigger asChild>
                  <button className={cn(
                    "w-full h-11 px-3 rounded-lg border border-input bg-background text-sm text-left flex items-center gap-2 hover:border-accent/50 transition-colors",
                    !startDate && "text-muted-foreground"
                  )}>
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    {startDate ? format(startDate, 'PPP') : 'Select compliance cycle start date'}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>

              {computedEndDate && (
                <div className="mt-3 flex items-center gap-3 px-4 py-3 rounded-lg bg-accent/5 border border-accent/20">
                  <CalendarIcon className="w-4 h-4 text-accent" />
                  <div>
                    <div className="text-xs text-muted-foreground">Computed End Date</div>
                    <div className="text-sm font-semibold text-foreground">{format(computedEndDate, 'PPP')}</div>
                  </div>
                  <div className="ml-auto text-xs text-muted-foreground">
                    {activities.length} activities • {activities.reduce((s, a) => s + a.duration_days, 0)} total days
                  </div>
                </div>
              )}
            </div>

            {/* Rulesets */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Choose Scheduling Rulesets
                <span className="normal-case text-muted-foreground/70 ml-2">(select multiple)</span>
              </h3>
              <p className="text-xs text-muted-foreground mb-4">The system applies the stricter rule when rulesets overlap.</p>
              <div className="space-y-3">
                {RULESETS.map(r => {
                  const isSelected = selectedRulesets.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => toggleRuleset(r.id)}
                      className={cn(
                        "w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4",
                        isSelected ? "border-accent bg-accent/5" : "border-border hover:border-accent/30 bg-card"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                        isSelected ? "border-accent bg-accent" : "border-border"
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-accent-foreground" />}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{r.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Merged rules */}
            {mergedRules && (
              <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Applied Constraints</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'minMeetingGap', label: 'Min Meeting Gap' },
                    { key: 'minExamGap', label: 'Min Exam Gap' },
                    { key: 'auditPrepBuffer', label: 'Audit Prep Buffer' },
                    { key: 'holidayBuffer', label: 'Holiday Buffer' },
                  ].map(({ key, label }) => (
                    <div key={key} className="px-4 py-3 rounded-lg border border-border bg-muted/30">
                      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
                      <div className="text-sm font-bold">{mergedRules[key as keyof typeof mergedRules]} days</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleProceedToConfirmation}
              disabled={!isValid}
              className={cn(
                "w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
                isValid ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md" : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
            >
              Proceed to Event Confirmation <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ============ STEP 2: CONFIRMATION ENGINE ============
  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="w-[420px] flex-shrink-0 border-r border-border overflow-y-auto bg-card">
          <div className="p-5 space-y-5">
            {/* Header */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => setStep(1)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Back to Rules
                </button>
              </div>
              <h1 className="text-xl font-display font-bold text-foreground">Event Confirmation</h1>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-muted-foreground">Question {currentIndex + 1} of {events.length}</span>
                <span className="text-sm font-semibold text-accent">{confirmedCount} / {events.length} confirmed</span>
              </div>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Question pagination */}
            <div className="flex items-center gap-1 flex-wrap">
              {currentPage > 0 && (
                <button onClick={() => setCurrentIndex(visibleRange.start - 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
              )}
              {Array.from({ length: visibleRange.end - visibleRange.start }, (_, i) => {
                const idx = visibleRange.start + i;
                const ev = events[idx];
                const isAnswered = ev?.status !== 'pending';
                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={cn(
                      "w-8 h-8 rounded-lg text-xs font-semibold transition-all",
                      idx === currentIndex
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : isAnswered
                        ? "bg-accent/10 text-accent border border-accent/30"
                        : "border border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
              {visibleRange.end < events.length && (
                <button onClick={() => setCurrentIndex(visibleRange.end)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Current question */}
            {currentEvent && (
              <div className="space-y-4" key={currentIndex}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">{currentEvent.name}</h3>
                  <span className="text-xs text-muted-foreground">Q {currentIndex + 1} / {events.length}</span>
                </div>

                {/* Tags */}
                <div className="flex gap-2">
                  {currentEvent.stage && (() => {
                    const colors = STAGE_COLORS[currentEvent.stage] || STAGE_COLORS.Administration;
                    return (
                      <span className={cn("text-[10px] font-semibold uppercase px-2.5 py-1 rounded-md border", colors.bg, colors.text, colors.border)}>
                        {currentEvent.stage}
                      </span>
                    );
                  })()}
                  <span className="text-[10px] font-medium text-muted-foreground px-2.5 py-1 rounded-md border border-border bg-background">
                    {currentEvent.duration} day{currentEvent.duration > 1 ? 's' : ''}
                  </span>
                </div>

                {/* Event card */}
                <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
                  <h3 className="text-lg font-display font-bold text-foreground">{currentEvent.name}</h3>

                  <div className="bg-muted/50 rounded-lg p-4 mt-4 text-center">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">Scheduled On</div>
                    <div className="text-2xl font-display font-bold text-foreground">
                      {format(parseISO(currentEvent.date), 'dd MMMM yyyy')}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mt-4 mb-3">Do you want to keep this date?</p>

                  <div className="space-y-2">
                    <button
                      onClick={() => handleAnswer('confirmed')}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border",
                        currentEvent.status === 'confirmed'
                          ? "bg-status-confirmed-bg border-status-confirmed text-status-confirmed"
                          : "border-border hover:border-status-confirmed hover:bg-status-confirmed-bg"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        currentEvent.status === 'confirmed' ? "border-status-confirmed bg-status-confirmed" : "border-border"
                      )}>
                        {currentEvent.status === 'confirmed' && <Check className="w-3 h-3 text-white" />}
                      </div>
                      Yes, keep this date
                    </button>

                    <button
                      onClick={() => handleAnswer('skipped')}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all border",
                        currentEvent.status === 'skipped'
                          ? "bg-status-onhold-bg border-status-onhold text-status-onhold"
                          : "border-border hover:border-muted-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        currentEvent.status === 'skipped' ? "border-status-onhold bg-status-onhold" : "border-border"
                      )}>
                        {currentEvent.status === 'skipped' && <Clock className="w-3 h-3 text-white" />}
                      </div>
                      Skip / Pending
                    </button>
                  </div>
                </div>

                {/* Back / Next */}
                <div className="flex gap-3">
                  <button
                    onClick={() => currentIndex > 0 && setCurrentIndex(prev => prev - 1)}
                    disabled={currentIndex === 0}
                    className={cn(
                      "flex-1 h-11 rounded-xl border border-border text-sm font-medium transition-all",
                      currentIndex === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-muted"
                    )}
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => currentIndex < events.length - 1 && setCurrentIndex(prev => prev + 1)}
                    disabled={currentIndex >= events.length - 1}
                    className={cn(
                      "flex-1 h-11 rounded-xl text-sm font-semibold transition-all",
                      currentIndex >= events.length - 1
                        ? "bg-accent/50 text-accent-foreground cursor-not-allowed"
                        : "bg-accent text-accent-foreground hover:bg-accent/90"
                    )}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Mini Calendar */}
            <div className="rounded-xl border border-border p-3 bg-background">
              <Calendar
                mode="single"
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={currentEvent ? parseISO(currentEvent.date) : undefined}
                onSelect={handleCalendarDateClick}
                modifiers={{ hasEvent: eventDates }}
                modifiersClassNames={{ hasEvent: 'bg-accent/20 font-bold text-accent' }}
                className="p-0 pointer-events-auto"
              />
              <div className="flex items-center gap-3 mt-2 px-1 flex-wrap">
                {Object.entries(STAGE_COLORS).slice(0, 5).map(([name, colors]) => (
                  <div key={name} className="flex items-center gap-1">
                    <div className={cn("w-2 h-2 rounded-full", colors.bg, colors.border, "border")} />
                    <span className="text-[9px] text-muted-foreground">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Calendar */}
        <div className="flex-1 flex flex-col overflow-hidden bg-background">
          {/* Header */}
          <div className="border-b border-border bg-card px-5 py-3 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">Calendar Editor</h2>
              <p className="text-xs text-muted-foreground">{events.length} events — click dates on left to navigate</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-muted rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('monthly')}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                    viewMode === 'monthly' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setViewMode('weekly')}
                  className={cn(
                    "px-4 py-1.5 rounded-md text-xs font-medium transition-all",
                    viewMode === 'weekly' ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Weekly
                </button>
              </div>

              {allConfirmed && (
                <button
                  onClick={handleFinalize}
                  disabled={finalizing}
                  className="px-4 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/90 transition-colors"
                >
                  {finalizing ? 'Finalizing...' : 'Finalize Calendar →'}
                </button>
              )}
            </div>
          </div>

          {/* Calendar nav */}
          <div className="border-b border-border bg-card/50 px-5 py-2 flex items-center gap-3 flex-shrink-0">
            <button onClick={() => navigateCalendar(-1)} className="p-1 rounded hover:bg-muted">
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <h3 className="text-sm font-display font-semibold min-w-[160px] text-center">
              {viewMode === 'monthly'
                ? format(calendarDate, 'MMMM yyyy')
                : `${format(startOfWeek(calendarDate), 'MMM d')} – ${format(endOfWeek(calendarDate), 'MMM d, yyyy')}`
              }
            </h3>
            <button onClick={() => navigateCalendar(1)} className="p-1 rounded hover:bg-muted">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto" ref={timelineRef}>
            {viewMode === 'monthly' ? (
              <div className="p-4 space-y-1">
                {timelineDays.map(day => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayEvents = events.filter(e => e.date === dateStr);
                  const isCurrentEventDay = currentEvent && currentEvent.date === dateStr;

                  return (
                    <div
                      key={dateStr}
                      ref={el => { dayRefs.current[dateStr] = el; }}
                      onClick={() => handleTimelineDateClick(dateStr)}
                      className={cn(
                        "rounded-lg transition-all cursor-pointer",
                        isCurrentEventDay && "ring-2 ring-accent/30",
                        dayEvents.length > 0 ? "bg-card border border-border p-3 mb-2" : "px-3 py-2 hover:bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "text-xs font-semibold",
                        dayEvents.length > 0 ? "text-accent mb-2" : "text-muted-foreground/60"
                      )}>
                        {format(day, 'EEE, dd MMM yyyy')}
                      </div>
                      {dayEvents.length === 0 && (
                        <div className="text-[10px] text-muted-foreground/40 ml-1">No events scheduled</div>
                      )}
                      {dayEvents.map((ev, i) => {
                        const stageColors = STAGE_COLORS[ev.stage || ''] || STAGE_COLORS.Administration;
                        return (
                          <div key={i} className="flex items-start justify-between rounded-lg p-3 border border-border bg-background">
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-foreground">{ev.name}</div>
                              <div className="text-xs text-muted-foreground mt-0.5">{ev.stage || 'Activity'}</div>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-muted">System</span>
                                {ev.stage && (
                                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded border", stageColors.bg, stageColors.text, stageColors.border)}>
                                    {ev.stage.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>
                            {ev.stage && (
                              <span className={cn("text-[10px] font-semibold uppercase px-2 py-1 rounded", stageColors.text)}>
                                {ev.stage.toUpperCase()}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* WEEKLY VIEW */
              <div className="flex flex-col h-full">
                <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border sticky top-0 bg-card z-10">
                  <div className="px-2 py-2 text-[10px] uppercase text-muted-foreground font-semibold">Time</div>
                  {weekDays.map(day => {
                    const hasEv = events.some(e => e.date === format(day, 'yyyy-MM-dd'));
                    return (
                      <div key={day.toISOString()} className={cn("text-center py-2 border-l border-border", isToday(day) && "bg-accent/5")}>
                        <div className="text-[10px] uppercase text-muted-foreground font-semibold">{format(day, 'EEE')}</div>
                        <div className={cn("text-lg font-bold", isToday(day) ? "text-accent" : "text-foreground")}>{format(day, 'd')}</div>
                        <div className="text-[10px] text-muted-foreground">{format(day, 'MMM')}</div>
                        {hasEv && <div className="w-1.5 h-1.5 rounded-full bg-accent mx-auto mt-0.5" />}
                      </div>
                    );
                  })}
                </div>
                <div className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                    {HOURS.map(hour => (
                      <div key={hour} className="contents">
                        <div className="h-14 text-[10px] text-muted-foreground text-right pr-2 pt-1 border-b border-border font-medium">
                          {formatHourShort(hour)}
                        </div>
                        {weekDays.map(day => {
                          const dateStr = format(day, 'yyyy-MM-dd');
                          const slotEvents = events.filter(e => e.date === dateStr);
                          // For day-level events, show them at 9 AM
                          const showHere = slotEvents.filter(() => hour === 9);
                          return (
                            <div
                              key={`${dateStr}-${hour}`}
                              onClick={() => handleTimelineDateClick(dateStr)}
                              className="h-14 border-l border-b border-border relative hover:bg-muted/20 cursor-pointer"
                            >
                              {showHere.map((ev, i) => {
                                const stageColors = STAGE_COLORS[ev.stage || ''] || STAGE_COLORS.Administration;
                                const isConfirmed = ev.status === 'confirmed';
                                return (
                                  <div
                                    key={i}
                                    className={cn(
                                      "absolute inset-x-0.5 z-10 rounded-md px-2 py-1 text-[10px] font-semibold overflow-hidden border-2",
                                      isConfirmed
                                        ? cn(stageColors.bg, stageColors.text, stageColors.border)
                                        : "bg-amber-50/60 text-amber-600 border-dashed border-amber-300"
                                    )}
                                    style={{ height: `${CELL_HEIGHT * 2}px`, top: 0 }}
                                  >
                                    <div className="truncate">{ev.name}</div>
                                    <div className="text-[9px] opacity-75">{ev.duration}d</div>
                                  </div>
                                );
                              })}
                              {slotEvents.length === 0 && hour === 9 && (
                                <span className="absolute inset-0 flex items-center justify-center text-[9px] text-muted-foreground/30">Free</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
