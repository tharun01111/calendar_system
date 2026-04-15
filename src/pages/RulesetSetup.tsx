import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAcademicStore } from '@/store/useAcademicStore';
import { useAuth } from '@/hooks/useAuth';
import { TEMPLATE_PRESETS, CALENDAR_LAYER_LABELS } from '@/types/academic';
import type { CalendarLayerType } from '@/types/academic';
import { GraduationCap, Calendar as CalendarIcon, ArrowRight, ArrowLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

type Ruleset = 'aicte' | 'naac' | 'nba' | 'anna-university' | 'custom';

const RULESETS: { id: Ruleset; name: string; description: string; presetIds: string[] }[] = [
  { id: 'aicte', name: 'AICTE', description: 'All India Council for Technical Education guidelines', presetIds: ['aicte-compliance'] },
  { id: 'naac', name: 'NAAC', description: 'National Assessment and Accreditation Council standards', presetIds: ['naac-accreditation'] },
  { id: 'nba', name: 'NBA', description: 'National Board of Accreditation framework', presetIds: ['nba-accreditation'] },
  { id: 'anna-university', name: 'Anna University', description: 'Anna University academic regulations', presetIds: ['odd-semester-exam', 'even-semester-exam', 'academic-admin'] },
  { id: 'custom', name: 'Custom Institutional Rules', description: 'Define your own scheduling constraints', presetIds: [] },
];

const RULE_DEFAULTS: Record<Ruleset, { minMeetingGap: number; minExamGap: number; auditPrepBuffer: number; holidayBuffer: number }> = {
  aicte: { minMeetingGap: 14, minExamGap: 21, auditPrepBuffer: 45, holidayBuffer: 7 },
  naac: { minMeetingGap: 14, minExamGap: 21, auditPrepBuffer: 45, holidayBuffer: 7 },
  nba: { minMeetingGap: 14, minExamGap: 21, auditPrepBuffer: 60, holidayBuffer: 7 },
  'anna-university': { minMeetingGap: 7, minExamGap: 14, auditPrepBuffer: 30, holidayBuffer: 5 },
  custom: { minMeetingGap: 7, minExamGap: 14, auditPrepBuffer: 30, holidayBuffer: 7 },
};

export default function RulesetSetup() {
  const navigate = useNavigate();
  const store = useAcademicStore();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedRulesets, setSelectedRulesets] = useState<Ruleset[]>([]);
  const [layerType, setLayerType] = useState<CalendarLayerType>('institution');
  const [entityName, setEntityName] = useState('');
  const [generating, setGenerating] = useState(false);

  // Merge rules: take the stricter (larger) value from all selected rulesets
  const mergedRules = useMemo(() => {
    if (selectedRulesets.length === 0) return RULE_DEFAULTS.aicte;
    return selectedRulesets.reduce(
      (merged, rulesetId) => {
        const r = RULE_DEFAULTS[rulesetId];
        return {
          minMeetingGap: Math.max(merged.minMeetingGap, r.minMeetingGap),
          minExamGap: Math.max(merged.minExamGap, r.minExamGap),
          auditPrepBuffer: Math.max(merged.auditPrepBuffer, r.auditPrepBuffer),
          holidayBuffer: Math.max(merged.holidayBuffer, r.holidayBuffer),
        };
      },
      { minMeetingGap: 0, minExamGap: 0, auditPrepBuffer: 0, holidayBuffer: 0 }
    );
  }, [selectedRulesets]);

  const isValid = startDate && endDate && selectedRulesets.length > 0 && endDate > startDate;

  const toggleRuleset = (id: Ruleset) => {
    setSelectedRulesets(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleGenerate = () => {
    if (!isValid || !startDate || !endDate) return;
    setGenerating(true);

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    const layerId = store.addCalendarLayer(layerType, entityName || selectedRulesets.map(r => RULESETS.find(rs => rs.id === r)?.name).join(' + '));

    // Collect all preset IDs from all selected rulesets
    const allPresetIds = new Set<string>();
    for (const rulesetId of selectedRulesets) {
      const ruleset = RULESETS.find(r => r.id === rulesetId)!;
      for (const pid of ruleset.presetIds) allPresetIds.add(pid);
    }

    // Create templates from presets
    for (const presetId of allPresetIds) {
      store.createFromPreset(presetId, startStr, endStr, layerId, layerType, entityName || 'Combined');
      const templates = store.templates;
      const lastTemplate = templates[templates.length - 1];
      if (lastTemplate) {
        store.autoSchedulePreset(lastTemplate.id);
      }
    }

    // If no presets (only custom), create blank template
    if (allPresetIds.size === 0) {
      store.createTemplate(
        `${entityName || 'Custom'} Calendar`,
        startStr, endStr,
        'Custom institutional calendar',
        layerId, layerType, entityName
      );
    }

    setTimeout(() => {
      setGenerating(false);
      navigate('/confirmations');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-accent" />
            <span className="font-display font-bold text-lg">AcadFlow</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/dashboard" className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-display font-bold text-foreground">Academic Calendar Setup</h1>
          <p className="text-muted-foreground mt-2">Configure academic year and scheduling constraints</p>
        </div>

        <div className="bg-card rounded-2xl border border-border p-8 space-y-8 shadow-sm">
          {/* Academic Dates */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Academic Dates</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Start Date <span className="text-destructive">*</span></label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn(
                      "w-full h-11 px-3 rounded-lg border border-input bg-background text-sm text-left flex items-center gap-2 hover:border-accent/50 transition-colors",
                      !startDate && "text-muted-foreground"
                    )}>
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      {startDate ? format(startDate, 'PPP') : 'Select start date'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">End Date <span className="text-destructive">*</span></label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className={cn(
                      "w-full h-11 px-3 rounded-lg border border-input bg-background text-sm text-left flex items-center gap-2 hover:border-accent/50 transition-colors",
                      !endDate && "text-muted-foreground"
                    )}>
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      {endDate ? format(endDate, 'PPP') : 'Select end date'}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={d => !!startDate && d <= startDate} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Calendar Layer */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Calendar Layer</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Layer Type</label>
                <select
                  value={layerType}
                  onChange={e => setLayerType(e.target.value as CalendarLayerType)}
                  className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30"
                >
                  {Object.entries(CALENDAR_LAYER_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Entity Name</label>
                <input
                  value={entityName}
                  onChange={e => setEntityName(e.target.value)}
                  placeholder="e.g., ECE, Batch 2026"
                  className="w-full h-11 px-3 rounded-lg border border-input bg-background text-sm outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>
          </div>

          {/* Multi-select Rulesets */}
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
                      isSelected
                        ? "border-accent bg-accent/5"
                        : "border-border hover:border-accent/30 bg-card"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                      isSelected ? "border-accent bg-accent" : "border-border"
                    )}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
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

          {/* Merged Rules Display */}
          {selectedRulesets.length > 0 && (
            <div className="animate-in fade-in-0 slide-in-from-top-2 duration-300">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Applied Scheduling Rules
                {selectedRulesets.length > 1 && (
                  <span className="text-accent ml-2 normal-case">(Strictest values from {selectedRulesets.length} rulesets)</span>
                )}
              </h3>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {[
                  { key: 'minMeetingGap', label: 'Min. Meeting Gap (days)' },
                  { key: 'minExamGap', label: 'Min. Exam Gap (days)' },
                  { key: 'auditPrepBuffer', label: 'Audit Prep Buffer (days)' },
                  { key: 'holidayBuffer', label: 'Holiday Buffer (days)' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">{label}</label>
                    <div className="w-full h-11 px-3 rounded-lg border border-input bg-muted/50 text-sm flex items-center font-semibold">
                      {mergedRules[key as keyof typeof mergedRules]} days
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generate */}
          <button
            onClick={handleGenerate}
            disabled={!isValid || generating}
            className={cn(
              "w-full h-12 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all",
              isValid
                ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-md"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            {generating ? (
              <span className="animate-pulse">Generating Calendar Recommendations...</span>
            ) : (
              <>Generate Calendar Recommendations <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </main>
    </div>
  );
}
