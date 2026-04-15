import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, format, parseISO } from 'date-fns';
import type { Block, BlockState, BlockType, CalendarLayer, CalendarLayerType, Connection, Frequency, ScheduledEvent, Template } from '@/types/academic';
import { BLOCK_COLORS, BLOCK_TYPE_COLORS, CALENDAR_LAYER_COLORS, TEMPLATE_PRESETS } from '@/types/academic';

interface AcademicStore {
  templates: Template[];
  activeTemplateId: string | null;
  selectedBlockId: string | null;
  isDirty: boolean;
  calendarLayers: CalendarLayer[];
  enabledLayerIds: string[];

  getActiveTemplate: () => Template | undefined;
  setActiveTemplate: (id: string) => void;
  setSelectedBlockId: (id: string | null) => void;

  // Layer management
  addCalendarLayer: (type: CalendarLayerType, entityName: string) => string;
  removeCalendarLayer: (id: string) => void;
  toggleLayer: (id: string) => void;
  setLayerEnabled: (id: string, enabled: boolean) => void;

  // Template CRUD
  createTemplate: (name: string, startDate: string, endDate: string, description?: string, layerId?: string, layerType?: CalendarLayerType, layerEntityName?: string) => void;
  createFromPreset: (presetId: string, startDate: string, endDate: string, layerId?: string, layerType?: CalendarLayerType, layerEntityName?: string) => void;
  autoSchedulePreset: (templateId: string) => void;
  duplicateTemplate: (id: string) => void;
  saveAsTemplate: (name: string) => void;
  renameTemplate: (id: string, name: string) => void;
  deleteTemplate: (id: string) => void;
  updateTemplateLayer: (templateId: string, layerId: string, layerType: CalendarLayerType, entityName: string) => void;

  // Block CRUD
  addBlock: (name: string, position?: { x: number; y: number }, blockType?: BlockType, category?: string, frequency?: Frequency) => void;
  updateBlock: (blockId: string, updates: Partial<Block>) => void;
  removeBlock: (blockId: string) => void;
  updateBlockPosition: (blockId: string, position: { x: number; y: number }) => void;

  // Connections
  addConnection: (source: string, target: string) => string | null;
  removeConnection: (connectionId: string) => void;

  // Scheduling
  scheduleBlock: (blockId: string, date: string, startHour: number, endHour: number) => string | null;
  unscheduleEvent: (eventId: string) => void;
  moveEvent: (eventId: string, date: string, startHour: number, endHour?: number) => string | null;

  // Cross-layer helpers
  getAllEventsForDate: (date: string) => { event: ScheduledEvent; block: Block; template: Template; layer?: CalendarLayer }[];
  getVisibleEvents: () => { event: ScheduledEvent; block: Block; template: Template; layer?: CalendarLayer }[];

  setConfirmationStatus: (blockId: string, status: BlockState) => void;
  markSaved: () => void;
}

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const updateActiveTemplate = (
  state: { templates: Template[]; activeTemplateId: string | null },
  updater: (t: Template) => Template
) => ({
  templates: state.templates.map(t =>
    t.id === state.activeTemplateId ? updater(t) : t
  ),
});

function createStartEndBlocks(startDate: string, endDate: string) {
  const startBlockId = generateUUID();
  const endBlockId = generateUUID();

  const startBlock: Block = {
    id: startBlockId,
    name: `START – ${format(new Date(startDate + 'T00:00:00'), 'dd MMM yyyy')}`,
    duration: 0,
    active: true,
    color: '160 50% 78%',
    state: 'unscheduled',
    position: { x: 250, y: 50 },
    locked: true,
  };

  const endBlock: Block = {
    id: endBlockId,
    name: `END – ${format(new Date(endDate + 'T00:00:00'), 'dd MMM yyyy')}`,
    duration: 0,
    active: true,
    color: '0 70% 80%',
    state: 'unscheduled',
    position: { x: 250, y: 400 },
    locked: true,
  };

  return { startBlockId, endBlockId, startBlock, endBlock };
}

// Default layers
const DEFAULT_LAYERS: CalendarLayer[] = [
  { id: 'layer-institution', type: 'institution', entityName: 'Institution', enabled: true, color: CALENDAR_LAYER_COLORS.institution },
  { id: 'layer-faculty', type: 'faculty', entityName: 'Faculty', enabled: true, color: CALENDAR_LAYER_COLORS.faculty },
  { id: 'layer-department', type: 'department', entityName: 'Department', enabled: true, color: CALENDAR_LAYER_COLORS.department },
  { id: 'layer-program', type: 'program', entityName: 'Program', enabled: true, color: CALENDAR_LAYER_COLORS.program },
  { id: 'layer-batch', type: 'batch', entityName: 'Batch', enabled: true, color: CALENDAR_LAYER_COLORS.batch },
  { id: 'layer-section', type: 'section', entityName: 'Section', enabled: true, color: CALENDAR_LAYER_COLORS.section },
];

export const useAcademicStore = create<AcademicStore>()(
  persist(
    (set, get) => ({
      templates: [],
      activeTemplateId: null,
      selectedBlockId: null,
      isDirty: false,
      calendarLayers: DEFAULT_LAYERS,
      enabledLayerIds: DEFAULT_LAYERS.map(l => l.id),

      getActiveTemplate: () => {
        const { templates, activeTemplateId } = get();
        return templates.find(t => t.id === activeTemplateId);
      },

      setActiveTemplate: (id) => set({ activeTemplateId: id, selectedBlockId: null }),

      setSelectedBlockId: (id) => set({ selectedBlockId: id }),

      // ─── Layer Management ──────────────────────────────────────
      addCalendarLayer: (type, entityName) => {
        const id = generateUUID();
        const layer: CalendarLayer = {
          id,
          type,
          entityName,
          enabled: true,
          color: CALENDAR_LAYER_COLORS[type],
        };
        set(state => ({
          calendarLayers: [...state.calendarLayers, layer],
          enabledLayerIds: [...state.enabledLayerIds, id],
        }));
        return id;
      },

      removeCalendarLayer: (id) => {
        set(state => ({
          calendarLayers: state.calendarLayers.filter(l => l.id !== id),
          enabledLayerIds: state.enabledLayerIds.filter(lid => lid !== id),
        }));
      },

      toggleLayer: (id) => {
        set(state => ({
          calendarLayers: state.calendarLayers.map(l =>
            l.id === id ? { ...l, enabled: !l.enabled } : l
          ),
          enabledLayerIds: state.enabledLayerIds.includes(id)
            ? state.enabledLayerIds.filter(lid => lid !== id)
            : [...state.enabledLayerIds, id],
        }));
      },

      setLayerEnabled: (id, enabled) => {
        set(state => ({
          calendarLayers: state.calendarLayers.map(l =>
            l.id === id ? { ...l, enabled } : l
          ),
          enabledLayerIds: enabled
            ? [...new Set([...state.enabledLayerIds, id])]
            : state.enabledLayerIds.filter(lid => lid !== id),
        }));
      },

      // ─── Template CRUD ────────────────────────────────────────
      createTemplate: (name, startDate, endDate, description = '', layerId, layerType, layerEntityName) => {
        const id = generateUUID();
        const { startBlockId, endBlockId, startBlock, endBlock } = createStartEndBlocks(startDate, endDate);

        const connection: Connection = {
          id: generateUUID(),
          source: startBlockId,
          target: endBlockId,
        };

        set(state => ({
          templates: [...state.templates, {
            id, name, description,
            academicStartDate: startDate,
            academicEndDate: endDate,
            blocks: [startBlock, endBlock],
            connections: [connection],
            scheduledEvents: [],
            layerId,
            layerType,
            layerEntityName,
          }],
          activeTemplateId: id,
          selectedBlockId: null,
          isDirty: true,
        }));
      },

      createFromPreset: (presetId, startDate, endDate, layerId, layerType, layerEntityName) => {
        const preset = TEMPLATE_PRESETS.find(p => p.id === presetId);
        if (!preset) return;

        const id = generateUUID();
        const { startBlockId, endBlockId, startBlock, endBlock } = createStartEndBlocks(startDate, endDate);

        const presetBlocks: Block[] = preset.blocks.map((pb, i) => ({
          id: generateUUID(),
          name: pb.name,
          duration: 2,
          active: true,
          color: BLOCK_TYPE_COLORS[preset.blockType],
          state: 'unscheduled' as const,
          position: { x: 250, y: 170 + i * 100 },
          blockType: preset.blockType,
          category: pb.category,
          frequency: pb.frequency || 'one-time',
          overrideable: true,
        }));

        endBlock.position = { x: 250, y: 170 + presetBlocks.length * 100 + 80 };

        const allBlockIds = [startBlockId, ...presetBlocks.map(b => b.id), endBlockId];
        const connections: Connection[] = [];
        for (let i = 0; i < allBlockIds.length - 1; i++) {
          connections.push({
            id: generateUUID(),
            source: allBlockIds[i],
            target: allBlockIds[i + 1],
          });
        }

        set(state => ({
          templates: [...state.templates, {
            id,
            name: preset.name,
            description: preset.description,
            academicStartDate: startDate,
            academicEndDate: endDate,
            blocks: [startBlock, ...presetBlocks, endBlock],
            connections,
            scheduledEvents: [],
            layerId,
            layerType,
            layerEntityName,
          }],
          activeTemplateId: id,
          selectedBlockId: null,
          isDirty: true,
        }));
      },

      autoSchedulePreset: (templateId) => {
        const state = get();
        const template = state.templates.find(t => t.id === templateId);
        if (!template) return;

        const preset = TEMPLATE_PRESETS.find(p => p.name === template.name);
        if (!preset?.hasOffsetRules) return;

        const startDate = parseISO(template.academicStartDate);
        const endDate = parseISO(template.academicEndDate);
        const nonLockedBlocks = template.blocks.filter(b => !b.locked);

        // Gather all existing events from all templates for conflict detection
        const allExistingEvents: { date: string; startHour: number; endHour: number; overrideable: boolean }[] = [];
        for (const t of state.templates) {
          for (const ev of t.scheduledEvents) {
            const block = t.blocks.find(b => b.id === ev.blockId);
            allExistingEvents.push({
              date: ev.date,
              startHour: ev.startHour,
              endHour: ev.endHour,
              overrideable: block?.overrideable !== false,
            });
          }
        }

        const newEvents: ScheduledEvent[] = [];
        const updatedBlocks = [...template.blocks];

        for (let i = 0; i < nonLockedBlocks.length; i++) {
          const block = nonLockedBlocks[i];
          const presetBlock = preset.blocks[i];
          if (!presetBlock?.offsetDays && presetBlock?.offsetDays !== 0) continue;

          let targetDate = addDays(startDate, presetBlock.offsetDays);
          
          // Ensure within academic range
          if (targetDate > endDate) targetDate = endDate;

          const defaultStartHour = 9;
          const defaultEndHour = defaultStartHour + block.duration;
          let dateStr = format(targetDate, 'yyyy-MM-dd');

          // Conflict avoidance: skip non-overrideable events
          let attempts = 0;
          while (attempts < 30) {
            const hasNonOverrideableConflict = allExistingEvents.some(ev =>
              !ev.overrideable && ev.date === dateStr &&
              defaultStartHour < ev.endHour && defaultEndHour > ev.startHour
            );
            const hasNewEventConflict = newEvents.some(ev =>
              ev.date === dateStr &&
              defaultStartHour < ev.endHour && defaultEndHour > ev.startHour
            );

            if (!hasNonOverrideableConflict && !hasNewEventConflict) break;

            targetDate = addDays(targetDate, 1);
            if (targetDate > endDate) break;
            dateStr = format(targetDate, 'yyyy-MM-dd');
            attempts++;
          }

          const event: ScheduledEvent = {
            id: generateUUID(),
            blockId: block.id,
            date: dateStr,
            startHour: defaultStartHour,
            endHour: defaultEndHour,
            templateId: templateId,
            layerId: template.layerId,
          };

          newEvents.push(event);
          allExistingEvents.push({
            date: dateStr,
            startHour: defaultStartHour,
            endHour: defaultEndHour,
            overrideable: block.overrideable !== false,
          });

          // Update block state
          const blockIndex = updatedBlocks.findIndex(b => b.id === block.id);
          if (blockIndex !== -1) {
            updatedBlocks[blockIndex] = { ...updatedBlocks[blockIndex], state: 'scheduled' };
          }
        }

        set(state => ({
          templates: state.templates.map(t =>
            t.id === templateId
              ? { ...t, scheduledEvents: [...t.scheduledEvents, ...newEvents], blocks: updatedBlocks }
              : t
          ),
          isDirty: true,
        }));
      },

      updateTemplateLayer: (templateId, layerId, layerType, entityName) => {
        set(state => ({
          templates: state.templates.map(t =>
            t.id === templateId ? { ...t, layerId, layerType, layerEntityName: entityName } : t
          ),
          isDirty: true,
        }));
      },

      duplicateTemplate: (templateId) => {
        const template = get().templates.find(t => t.id === templateId);
        if (!template) return;

        const newId = generateUUID();
        const idMap: Record<string, string> = {};
        
        const newBlocks = template.blocks.map(b => {
          const newBlockId = generateUUID();
          idMap[b.id] = newBlockId;
          return { ...b, id: newBlockId };
        });

        const newConnections = template.connections.map(c => ({
          id: generateUUID(),
          source: idMap[c.source] || c.source,
          target: idMap[c.target] || c.target,
        }));

        set(state => ({
          templates: [...state.templates, {
            ...template,
            id: newId,
            name: `${template.name} (Copy)`,
            blocks: newBlocks,
            connections: newConnections,
            scheduledEvents: [],
          }],
          activeTemplateId: newId,
          isDirty: true,
        }));
      },

      saveAsTemplate: (name) => {
        const template = get().getActiveTemplate();
        if (!template) return;

        const newId = generateUUID();
        const idMap: Record<string, string> = {};

        const newBlocks = template.blocks.map(b => {
          const newBlockId = generateUUID();
          idMap[b.id] = newBlockId;
          return { ...b, id: newBlockId, state: 'unscheduled' as const };
        });

        const newConnections = template.connections.map(c => ({
          id: generateUUID(),
          source: idMap[c.source] || c.source,
          target: idMap[c.target] || c.target,
        }));

        set(state => ({
          templates: [...state.templates, {
            ...template,
            id: newId,
            name,
            blocks: newBlocks,
            connections: newConnections,
            scheduledEvents: [],
          }],
          activeTemplateId: newId,
          isDirty: true,
        }));
      },

      renameTemplate: (id, name) => {
        set(state => ({
          templates: state.templates.map(t => t.id === id ? { ...t, name } : t),
          isDirty: true,
        }));
      },

      deleteTemplate: (id) => {
        set(state => ({
          templates: state.templates.filter(t => t.id !== id),
          activeTemplateId: state.activeTemplateId === id
            ? (state.templates.find(t => t.id !== id)?.id ?? null)
            : state.activeTemplateId,
          isDirty: true,
        }));
      },

      // ─── Block CRUD ───────────────────────────────────────────
      addBlock: (name, position, blockType = 'custom', category, frequency = 'one-time') => {
        const template = get().getActiveTemplate();
        if (!template) return;

        const endBlock = template.blocks.find(b => b.locked && b.name.startsWith('END'));
        const nonLockedBlocks = template.blocks.filter(b => !b.locked);
        const color = BLOCK_TYPE_COLORS[blockType] || BLOCK_COLORS[nonLockedBlocks.length % BLOCK_COLORS.length];

        const yPos = endBlock
          ? endBlock.position.y - 20
          : 100 + nonLockedBlocks.length * 120;

        const block: Block = {
          id: generateUUID(),
          name,
          duration: 2,
          active: true,
          color,
          state: 'unscheduled',
          position: position ?? { x: 250, y: yPos },
          blockType,
          category,
          frequency,
          overrideable: true,
        };

        set(state => updateActiveTemplate(state, t => {
          const newBlocks = [...t.blocks.map(b => {
            if (b.locked && b.name.startsWith('END')) {
              return { ...b, position: { ...b.position, y: b.position.y + 120 } };
            }
            return b;
          }), block];
          return { ...t, blocks: newBlocks };
        }));
        set({ isDirty: true });
      },

      updateBlock: (blockId, updates) => {
        set(state => ({
          ...updateActiveTemplate(state, t => ({
            ...t, blocks: t.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b),
          })),
          isDirty: true,
        }));
      },

      removeBlock: (blockId) => {
        const template = get().getActiveTemplate();
        if (!template) return;
        const block = template.blocks.find(b => b.id === blockId);
        if (block?.locked) return;

        set(state => ({
          ...updateActiveTemplate(state, t => ({
            ...t,
            blocks: t.blocks.filter(b => b.id !== blockId),
            connections: t.connections.filter(c => c.source !== blockId && c.target !== blockId),
            scheduledEvents: t.scheduledEvents.filter(e => e.blockId !== blockId),
          })),
          isDirty: true,
        }));
      },

      updateBlockPosition: (blockId, position) => {
        set(state => ({
          ...updateActiveTemplate(state, t => ({
            ...t, blocks: t.blocks.map(b => b.id === blockId ? { ...b, position } : b),
          })),
          isDirty: true,
        }));
      },

      // ─── Connections ──────────────────────────────────────────
      addConnection: (source, target) => {
        if (source === target) return 'Cannot connect a block to itself.';
        const template = get().getActiveTemplate();
        if (!template) return 'No active template.';

        const exists = template.connections.some(c => c.source === source && c.target === target);
        if (exists) return 'Connection already exists.';

        const reverse = template.connections.some(c => c.source === target && c.target === source);
        if (reverse) return 'Flow must follow chronological sequence.';

        const adjacency: Record<string, string[]> = {};
        for (const c of template.connections) {
          if (!adjacency[c.source]) adjacency[c.source] = [];
          adjacency[c.source].push(c.target);
        }
        if (!adjacency[source]) adjacency[source] = [];
        adjacency[source].push(target);

        const visited = new Set<string>();
        const hasCycle = (node: string, path: Set<string>): boolean => {
          if (path.has(node)) return true;
          if (visited.has(node)) return false;
          visited.add(node);
          path.add(node);
          for (const next of adjacency[node] || []) {
            if (hasCycle(next, path)) return true;
          }
          path.delete(node);
          return false;
        };

        if (hasCycle(source, new Set())) {
          return 'Flow must follow chronological sequence.';
        }

        const conn: Connection = { id: generateUUID(), source, target };
        set(state => ({
          ...updateActiveTemplate(state, t => ({
            ...t, connections: [...t.connections, conn],
          })),
          isDirty: true,
        }));
        return null;
      },

      removeConnection: (connectionId) => {
        set(state => ({
          ...updateActiveTemplate(state, t => ({
            ...t, connections: t.connections.filter(c => c.id !== connectionId),
          })),
          isDirty: true,
        }));
      },

      // ─── Scheduling (cross-layer conflict detection) ──────────
      scheduleBlock: (blockId, date, startHour, endHour) => {
        const state = get();
        const template = state.getActiveTemplate();
        if (!template) return 'No active template.';

        const block = template.blocks.find(b => b.id === blockId);
        if (!block) return 'Block not found.';
        if (block.locked) return 'Cannot schedule start/end blocks.';

        if (date < template.academicStartDate || date > template.academicEndDate) {
          return 'Activity must be scheduled between Academic Start and End dates.';
        }

        // Cross-layer conflict detection
        const allEvents = state.getAllEventsForDate(date);
        const overlap = allEvents.find(({ event: e, block: b }) =>
          startHour < e.endHour && endHour > e.startHour && b.overrideable === false
        );
        if (overlap) {
          return `Cannot schedule. Non-overrideable conflict with "${overlap.block.name}".`;
        }

        // Same-template overlap
        const sameTemplateOverlap = template.scheduledEvents.find(e =>
          e.date === date && startHour < e.endHour && endHour > e.startHour
        );
        if (sameTemplateOverlap) {
          const overlapBlock = template.blocks.find(b => b.id === sameTemplateOverlap.blockId);
          return `Cannot schedule. Overlaps with ${overlapBlock?.name || 'another event'}.`;
        }

        // Predecessor check
        const predecessors = template.connections
          .filter(c => c.target === blockId)
          .map(c => c.source);

        for (const predId of predecessors) {
          const predBlock = template.blocks.find(b => b.id === predId);
          if (predBlock?.locked) continue;
          const predEvent = template.scheduledEvents.find(e => e.blockId === predId);
          if (!predEvent) {
            return `Cannot schedule. ${predBlock?.name || 'Predecessor'} must be scheduled first.`;
          }
          if (date < predEvent.date || (date === predEvent.date && startHour < predEvent.endHour)) {
            return `Cannot schedule before ${predBlock?.name || 'predecessor'}.`;
          }
        }

        const event: ScheduledEvent = {
          id: generateUUID(),
          blockId, date, startHour, endHour,
          templateId: template.id,
          layerId: template.layerId,
        };
        set(state => ({
          ...updateActiveTemplate(state, t => ({
            ...t,
            scheduledEvents: [...t.scheduledEvents, event],
            blocks: t.blocks.map(b => b.id === blockId ? { ...b, state: 'scheduled' as const } : b),
          })),
          isDirty: true,
        }));
        return null;
      },

      unscheduleEvent: (eventId) => {
        set(state => ({
          ...updateActiveTemplate(state, t => {
            const event = t.scheduledEvents.find(e => e.id === eventId);
            return {
              ...t,
              scheduledEvents: t.scheduledEvents.filter(e => e.id !== eventId),
              blocks: event
                ? t.blocks.map(b => b.id === event.blockId ? { ...b, state: 'unscheduled' as const } : b)
                : t.blocks,
            };
          }),
          isDirty: true,
        }));
      },

      moveEvent: (eventId, date, startHour, endHour?) => {
        const state = get();
        const template = state.getActiveTemplate();
        if (!template) return 'No active template.';
        const event = template.scheduledEvents.find(e => e.id === eventId);
        if (!event) return 'Event not found.';
        const duration = event.endHour - event.startHour;
        const newEndHour = endHour ?? startHour + duration;

        if (date < template.academicStartDate || date > template.academicEndDate) {
          return 'Activity must remain between Academic Start and End dates.';
        }

        // Cross-layer conflict detection for non-overrideable
        const allEvents = state.getAllEventsForDate(date);
        const nonOverrideableConflict = allEvents.find(({ event: e, block: b }) =>
          e.id !== eventId && b.overrideable === false &&
          startHour < e.endHour && newEndHour > e.startHour
        );
        if (nonOverrideableConflict) {
          return `Conflict detected with non-overrideable "${nonOverrideableConflict.block.name}". Choose another slot.`;
        }

        const overlap = template.scheduledEvents.find(e =>
          e.id !== eventId && e.date === date && startHour < e.endHour && newEndHour > e.startHour
        );
        if (overlap) {
          const overlapBlock = template.blocks.find(b => b.id === overlap.blockId);
          return `Conflict detected with ${overlapBlock?.name || 'another event'}.`;
        }

        set(state => ({
          ...updateActiveTemplate(state, t => ({
            ...t,
            scheduledEvents: t.scheduledEvents.map(e =>
              e.id === eventId ? { ...e, date, startHour, endHour: newEndHour } : e
            ),
          })),
          isDirty: true,
        }));
        return null;
      },

      // ─── Cross-layer event helpers ────────────────────────────
      getAllEventsForDate: (date) => {
        const state = get();
        const results: { event: ScheduledEvent; block: Block; template: Template; layer?: CalendarLayer }[] = [];
        for (const t of state.templates) {
          for (const ev of t.scheduledEvents) {
            if (ev.date !== date) continue;
            const block = t.blocks.find(b => b.id === ev.blockId);
            if (!block) continue;
            const layer = t.layerId ? state.calendarLayers.find(l => l.id === t.layerId) : undefined;
            results.push({ event: ev, block, template: t, layer });
          }
        }
        return results;
      },

      getVisibleEvents: () => {
        const state = get();
        const results: { event: ScheduledEvent; block: Block; template: Template; layer?: CalendarLayer }[] = [];
        for (const t of state.templates) {
          const layer = t.layerId ? state.calendarLayers.find(l => l.id === t.layerId) : undefined;
          // If template has a layer, check if that layer is enabled
          if (layer && !state.enabledLayerIds.includes(layer.id)) continue;
          for (const ev of t.scheduledEvents) {
            const block = t.blocks.find(b => b.id === ev.blockId);
            if (!block) continue;
            results.push({ event: ev, block, template: t, layer });
          }
        }
        return results;
      },

      setConfirmationStatus: (blockId, status) => {
        set(state => ({
          ...updateActiveTemplate(state, t => ({
            ...t,
            blocks: t.blocks.map(b => b.id === blockId ? { ...b, state: status } : b),
          })),
          isDirty: true,
        }));
      },

      markSaved: () => set({ isDirty: false }),
    }),
    {
      name: 'acadflow-storage',
      partialize: (state) => ({
        templates: state.templates,
        activeTemplateId: state.activeTemplateId,
        calendarLayers: state.calendarLayers,
        enabledLayerIds: state.enabledLayerIds,
      }),
    }
  )
);
