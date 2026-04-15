import { useState, useRef, useEffect } from 'react';
import { useAcademicStore } from '@/store/useAcademicStore';
import { CALENDAR_LAYER_LABELS, CALENDAR_LAYER_COLORS } from '@/types/academic';
import type { CalendarLayerType } from '@/types/academic';
import { Layers, Plus, X, ChevronDown, ChevronRight, CalendarDays } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

export function CalendarLayerPanel() {
  const { calendarLayers, toggleLayer, addCalendarLayer, removeCalendarLayer, templates } = useAcademicStore();
  const [collapsed, setCollapsed] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newLayerType, setNewLayerType] = useState<CalendarLayerType>('department');
  const [newEntityName, setNewEntityName] = useState('');

  const handleAdd = () => {
    if (!newEntityName.trim()) return;
    addCalendarLayer(newLayerType, newEntityName.trim());
    setNewEntityName('');
    setShowAdd(false);
  };

  // Group layers by type
  const layersByType = calendarLayers.reduce<Record<string, typeof calendarLayers>>((acc, layer) => {
    const key = layer.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(layer);
    return acc;
  }, {});

  // Count templates per layer
  const templatesPerLayer = (layerId: string) =>
    templates.filter(t => t.layerId === layerId).length;

  // Count events per layer
  const eventsPerLayer = (layerId: string) =>
    templates.filter(t => t.layerId === layerId).reduce((sum, t) => sum + t.scheduledEvents.length, 0);

  if (collapsed) {
    return (
      <div className="border-r border-border bg-card flex flex-col items-center py-3 w-10 flex-shrink-0">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          title="Show Calendars"
        >
          <Layers className="w-4 h-4" />
        </button>
        {/* Mini layer dots */}
        <div className="mt-3 space-y-1.5">
          {calendarLayers.filter(l => l.enabled).map(layer => (
            <div
              key={layer.id}
              className="w-2.5 h-2.5 rounded-full mx-auto"
              style={{ backgroundColor: `hsl(${layer.color})` }}
              title={layer.entityName}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="border-r border-border bg-card flex flex-col h-full w-52 flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <button
          onClick={() => setCollapsed(true)}
          className="flex items-center gap-1.5 text-[10px] font-semibold font-display uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Calendars
        </button>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Add layer form */}
        {showAdd && (
          <div className="p-2.5 border-b border-border bg-muted/20 space-y-2 animate-slide-in">
            <select
              value={newLayerType}
              onChange={(e) => setNewLayerType(e.target.value as CalendarLayerType)}
              className="w-full text-xs bg-card border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent"
            >
              {Object.entries(CALENDAR_LAYER_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <input
              value={newEntityName}
              onChange={(e) => setNewEntityName(e.target.value)}
              placeholder="Entity name (e.g., ECE)"
              className="w-full text-xs bg-card border border-border rounded-lg px-2 py-1.5 outline-none focus:ring-1 focus:ring-accent"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleAdd}
                disabled={!newEntityName.trim()}
                className="flex-1 text-xs px-2 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAdd(false); setNewEntityName(''); }}
                className="text-xs px-2 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Layer list grouped by type */}
        <div className="p-1.5 space-y-1">
          {Object.entries(layersByType).map(([type, layers]) => (
            <div key={type}>
              <div className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wider px-2 pt-2 pb-0.5">
                {CALENDAR_LAYER_LABELS[type as CalendarLayerType]}
              </div>
              {layers.map(layer => {
                const tCount = templatesPerLayer(layer.id);
                const eCount = eventsPerLayer(layer.id);
                const isDefault = layer.id.startsWith('layer-');
                return (
                  <div
                    key={layer.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <Checkbox
                      checked={layer.enabled}
                      onCheckedChange={() => toggleLayer(layer.id)}
                      className="h-3.5 w-3.5 rounded"
                      style={{
                        borderColor: `hsl(${layer.color})`,
                        backgroundColor: layer.enabled ? `hsl(${layer.color})` : undefined,
                      }}
                    />
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `hsl(${layer.color})` }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {layer.entityName}
                      </div>
                      {(tCount > 0 || eCount > 0) && (
                        <div className="text-[9px] text-muted-foreground">
                          {tCount > 0 && `${tCount} flow${tCount !== 1 ? 's' : ''}`}
                          {tCount > 0 && eCount > 0 && ' · '}
                          {eCount > 0 && `${eCount} event${eCount !== 1 ? 's' : ''}`}
                        </div>
                      )}
                    </div>
                    {!isDefault && (
                      <button
                        onClick={() => removeCalendarLayer(layer.id)}
                        className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
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
