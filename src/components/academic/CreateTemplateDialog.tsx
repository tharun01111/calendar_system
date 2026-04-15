import { useState, useMemo } from 'react';
import { useAcademicStore } from '@/store/useAcademicStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, AlertCircle, Sparkles, FileText, Zap, Building2, Users, User } from 'lucide-react';
import { format, addMonths, differenceInDays, parseISO } from 'date-fns';
import { TEMPLATE_PRESETS, CALENDAR_LAYER_LABELS } from '@/types/academic';
import type { CalendarLayerType } from '@/types/academic';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTemplateDialog({ open, onOpenChange }: CreateTemplateDialogProps) {
  const { createTemplate, createFromPreset, autoSchedulePreset, calendarLayers } = useAcademicStore();
  const { user } = useAuth();
  const today = new Date();

  const [mode, setMode] = useState<'blank' | 'preset'>('blank');
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState(format(today, 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addMonths(today, 6), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // Applicable To checkboxes
  const [applicableInstitution, setApplicableInstitution] = useState(true);
  const [applicableDepartment, setApplicableDepartment] = useState(false);
  const [applicableFaculty, setApplicableFaculty] = useState(false);

  // Layer assignment
  const [selectedLayerId, setSelectedLayerId] = useState<string>('');
  const [selectedLayerType, setSelectedLayerType] = useState<CalendarLayerType>('institution');
  const [layerEntityName, setLayerEntityName] = useState('');

  // Auto schedule toggle
  const [autoSchedule, setAutoSchedule] = useState(true);

  const selectedPresetData = TEMPLATE_PRESETS.find(p => p.id === selectedPreset);

  const dateError = useMemo(() => {
    if (!startDate || !endDate) return null;
    if (endDate <= startDate) return 'End date must be after start date';
    return null;
  }, [startDate, endDate]);

  const durationDays = useMemo(() => {
    if (!startDate || !endDate || dateError) return null;
    return differenceInDays(parseISO(endDate), parseISO(startDate));
  }, [startDate, endDate, dateError]);

  const isValid = mode === 'preset'
    ? selectedPreset && !dateError && startDate && endDate
    : name.trim() && !dateError && startDate && endDate;

  const handleCreate = async () => {
    if (!isValid) return;

    const layerId = selectedLayerId || undefined;
    const layerType = selectedLayerId
      ? calendarLayers.find(l => l.id === selectedLayerId)?.type
      : undefined;
    const entityName = selectedLayerId
      ? calendarLayers.find(l => l.id === selectedLayerId)?.entityName
      : undefined;

    // Build applicable_to array
    const applicableTo: ('institution' | 'department' | 'faculty')[] = [];
    if (applicableInstitution) applicableTo.push('institution');
    if (applicableDepartment) applicableTo.push('department');
    if (applicableFaculty) applicableTo.push('faculty');
    if (applicableTo.length === 0) applicableTo.push('institution');

    if (mode === 'preset' && selectedPreset) {
      createFromPreset(selectedPreset, startDate, endDate, layerId, layerType, entityName);
      
      if (autoSchedule && selectedPresetData?.hasOffsetRules) {
        setTimeout(() => {
          const store = useAcademicStore.getState();
          if (store.activeTemplateId) {
            store.autoSchedulePreset(store.activeTemplateId);
            toast.success('Schedule auto-generated from preset rules');
          }
        }, 50);
      }
    } else {
      createTemplate(name.trim(), startDate, endDate, description.trim(), layerId, layerType, entityName);
    }

    // Save to database
    if (user) {
      const templateName = mode === 'preset' && selectedPresetData ? selectedPresetData.name : name.trim();
      const templateDesc = mode === 'preset' && selectedPresetData ? selectedPresetData.description : description.trim();

      const { data: flowTemplate, error } = await supabase
        .from('flow_templates')
        .insert({
          name: templateName,
          description: templateDesc || null,
          applicable_to: applicableTo,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to save flow template:', error);
      } else if (flowTemplate) {
        // Save activities from the local template blocks
        const store = useAcademicStore.getState();
        const activeTemplate = store.getActiveTemplate();
        if (activeTemplate) {
          const activities = activeTemplate.blocks
            .filter(b => !b.locked && b.active)
            .map((b, idx) => ({
              flow_template_id: flowTemplate.id,
              name: b.name,
              stage: b.category || null,
              duration_days: b.duration ? Math.ceil(b.duration / 24) : 1,
              sequence_order: idx,
            }));

          if (activities.length > 0) {
            await supabase.from('flow_activities').insert(activities);
          }
        }
        toast.success('Flow template saved to database');
      }
    }

    setName('');
    setDescription('');
    setSelectedPreset(null);
    setMode('blank');
    setSelectedLayerId('');
    setApplicableInstitution(true);
    setApplicableDepartment(false);
    setApplicableFaculty(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Create Template</DialogTitle>
        </DialogHeader>

        {/* Mode Tabs */}
        <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
          <button
            onClick={() => setMode('blank')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'blank' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3 h-3" />
            Blank Template
          </button>
          <button
            onClick={() => setMode('preset')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              mode === 'preset' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            From Preset
          </button>
        </div>

        <div className="space-y-4 py-1">
          {mode === 'blank' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., AICTE Compliance Flow"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description..."
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Select Preset</Label>
              <div className="grid gap-1.5 max-h-48 overflow-y-auto pr-1">
                {TEMPLATE_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`text-left px-3 py-2 rounded-lg border transition-all text-sm ${
                      selectedPreset === preset.id
                        ? 'border-accent bg-accent/5 ring-1 ring-accent/20'
                        : 'border-border hover:border-accent/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="font-medium text-xs">{preset.name}</div>
                      {preset.hasOffsetRules && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
                          Auto-schedule
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{preset.description}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {preset.blocks.length} blocks · {preset.blockType}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Applicable To */}
          <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
            <Label className="flex items-center gap-1.5 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-accent" />
              Applicable To
            </Label>
            <p className="text-[10px] text-muted-foreground">Select who this flow applies to</p>
            <div className="space-y-2 mt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={applicableInstitution}
                  onCheckedChange={(v) => setApplicableInstitution(!!v)}
                />
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Institution</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={applicableDepartment}
                  onCheckedChange={(v) => setApplicableDepartment(!!v)}
                />
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Department</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={applicableFaculty}
                  onCheckedChange={(v) => setApplicableFaculty(!!v)}
                />
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Faculty</span>
              </label>
            </div>
          </div>

          <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
            <Label className="flex items-center gap-1.5 text-xs">
              <span className="w-2 h-2 rounded-full bg-accent" />
              Assign to Calendar Layer
            </Label>
            <select
              value={selectedLayerId}
              onChange={(e) => setSelectedLayerId(e.target.value)}
              className="w-full text-sm bg-card border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="">No layer (standalone)</option>
              {calendarLayers.map(layer => (
                <option key={layer.id} value={layer.id}>
                  {CALENDAR_LAYER_LABELS[layer.type]} – {layer.entityName}
                </option>
              ))}
            </select>
            {selectedLayerId && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: `hsl(${calendarLayers.find(l => l.id === selectedLayerId)?.color || ''})` }}
                />
                Events will appear under this calendar layer
              </div>
            )}
          </div>

          {/* Auto-schedule toggle for presets */}
          {mode === 'preset' && selectedPresetData?.hasOffsetRules && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-accent/20 bg-accent/5">
              <Zap className="w-4 h-4 text-accent flex-shrink-0" />
              <div className="flex-1">
                <div className="text-xs font-medium">Auto-generate schedule</div>
                <div className="text-[10px] text-muted-foreground">
                  Automatically place events based on offset rules from start date
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSchedule}
                  onChange={() => setAutoSchedule(!autoSchedule)}
                  className="sr-only"
                />
                <div className={`w-8 h-4 rounded-full transition-colors ${autoSchedule ? 'bg-accent' : 'bg-muted'}`}>
                  <div
                    className="w-3 h-3 rounded-full bg-card shadow-sm transition-transform mt-0.5"
                    style={{ marginLeft: autoSchedule ? '18px' : '2px' }}
                  />
                </div>
              </label>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-date">Academic Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Academic End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {dateError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-3.5 h-3.5" />
              {dateError}
            </div>
          )}

          {durationDays !== null && (
            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
              Template duration: <span className="font-semibold text-foreground">{durationDays} days</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={!isValid}>
            <Plus className="w-4 h-4 mr-1" />
            {mode === 'preset' && autoSchedule && selectedPresetData?.hasOffsetRules
              ? 'Create & Schedule'
              : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
