import { useAcademicStore } from '@/store/useAcademicStore';
import { BLOCK_TYPE_LABELS, BLOCK_TYPE_COLORS, FREQUENCY_LABELS, ACTIVITY_CATEGORIES, CALENDAR_LAYER_LABELS } from '@/types/academic';
import type { BlockType, Frequency } from '@/types/academic';
import { X, User, FileText, Bell, Tag, Clock, Layers, Shield } from 'lucide-react';

export function BlockPropertiesPanel() {
  const store = useAcademicStore();
  const template = store.getActiveTemplate();
  const selectedBlockId = store.selectedBlockId;

  const block = template?.blocks.find(b => b.id === selectedBlockId);

  if (!block || block.locked) return null;

  const layer = template?.layerId
    ? store.calendarLayers.find(l => l.id === template.layerId)
    : undefined;

  return (
    <div className="w-72 border-l border-border bg-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <h3 className="text-xs font-semibold font-display uppercase tracking-wider text-muted-foreground">
          Block Properties
        </h3>
        <button
          onClick={() => store.setSelectedBlockId(null)}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Activity Name */}
        <FieldGroup icon={<FileText className="w-3 h-3" />} label="Activity Name">
          <input
            value={block.name}
            onChange={(e) => store.updateBlock(block.id, { name: e.target.value })}
            className="w-full text-sm bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent"
          />
        </FieldGroup>

        {/* Block Type */}
        <FieldGroup icon={<Layers className="w-3 h-3" />} label="Block Type">
          <select
            value={block.blockType || 'custom'}
            onChange={(e) => {
              const bt = e.target.value as BlockType;
              store.updateBlock(block.id, {
                blockType: bt,
                color: BLOCK_TYPE_COLORS[bt],
              });
            }}
            className="w-full text-sm bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent"
          >
            {Object.entries(BLOCK_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </FieldGroup>

        {/* Category */}
        <FieldGroup icon={<Tag className="w-3 h-3" />} label="Category">
          <select
            value={block.category || ''}
            onChange={(e) => store.updateBlock(block.id, { category: e.target.value || undefined })}
            className="w-full text-sm bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">None</option>
            {ACTIVITY_CATEGORIES.map(group => (
              <optgroup key={group.groupName} label={group.groupName}>
                {group.categories.map(cat => (
                  <option key={cat.name} value={cat.name}>{cat.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </FieldGroup>

        {/* Frequency */}
        <FieldGroup icon={<Clock className="w-3 h-3" />} label="Frequency">
          <select
            value={block.frequency || 'one-time'}
            onChange={(e) => store.updateBlock(block.id, { frequency: e.target.value as Frequency })}
            className="w-full text-sm bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent"
          >
            {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </FieldGroup>

        {/* Duration */}
        <FieldGroup icon={<Clock className="w-3 h-3" />} label="Duration (hours)">
          <input
            type="number"
            min={1}
            max={12}
            value={block.duration}
            onChange={(e) => store.updateBlock(block.id, { duration: Math.max(1, parseInt(e.target.value) || 1) })}
            className="w-full text-sm bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent"
          />
        </FieldGroup>

        {/* Responsible Person */}
        <FieldGroup icon={<User className="w-3 h-3" />} label="Responsible Person">
          <input
            value={block.responsiblePerson || ''}
            onChange={(e) => store.updateBlock(block.id, { responsiblePerson: e.target.value })}
            placeholder="e.g., Dr. Kumar"
            className="w-full text-sm bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent placeholder:text-muted-foreground/50"
          />
        </FieldGroup>

        {/* Overrideable toggle */}
        <FieldGroup icon={<Shield className="w-3 h-3" />} label="Override Protection">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {block.overrideable === false ? 'Non-overrideable (locked slot)' : 'Overrideable'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={block.overrideable !== false}
                onChange={() => store.updateBlock(block.id, { overrideable: block.overrideable === false ? true : false })}
                className="sr-only"
              />
              <div className={`w-8 h-4 rounded-full transition-colors ${block.overrideable !== false ? 'bg-accent' : 'bg-destructive/60'}`}>
                <div
                  className="w-3 h-3 rounded-full bg-card shadow-sm transition-transform mt-0.5"
                  style={{ marginLeft: block.overrideable !== false ? '18px' : '2px' }}
                />
              </div>
            </label>
          </div>
        </FieldGroup>

        {/* Reminder */}
        <FieldGroup icon={<Bell className="w-3 h-3" />} label="Reminder">
          <select
            value={block.reminder || ''}
            onChange={(e) => store.updateBlock(block.id, { reminder: e.target.value || undefined })}
            className="w-full text-sm bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="">No reminder</option>
            <option value="1-day">1 day before</option>
            <option value="3-days">3 days before</option>
            <option value="1-week">1 week before</option>
            <option value="2-weeks">2 weeks before</option>
          </select>
        </FieldGroup>

        {/* Notes */}
        <FieldGroup icon={<FileText className="w-3 h-3" />} label="Notes">
          <textarea
            value={block.notes || ''}
            onChange={(e) => store.updateBlock(block.id, { notes: e.target.value })}
            placeholder="Additional notes..."
            rows={3}
            className="w-full text-sm bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-accent resize-none placeholder:text-muted-foreground/50"
          />
        </FieldGroup>

        {/* Layer info */}
        {layer && (
          <div className="pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${layer.color})` }} />
              <span>Layer: {CALENDAR_LAYER_LABELS[layer.type]} – {layer.entityName}</span>
            </div>
          </div>
        )}

        {/* Color preview */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${block.color})` }} />
            <span>Color: {BLOCK_TYPE_LABELS[block.blockType || 'custom']}</span>
          </div>
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">Active</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={block.active}
              onChange={() => store.updateBlock(block.id, { active: !block.active })}
              className="sr-only"
            />
            <div className={`w-8 h-4 rounded-full transition-colors ${block.active ? 'bg-accent' : 'bg-muted'}`}>
              <div
                className="w-3 h-3 rounded-full bg-card shadow-sm transition-transform mt-0.5"
                style={{ marginLeft: block.active ? '18px' : '2px' }}
              />
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

function FieldGroup({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}
