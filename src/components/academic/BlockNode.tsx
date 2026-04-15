import { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useAcademicStore } from '@/store/useAcademicStore';
import { BLOCK_COLORS, BLOCK_COLOR_NAMES, BLOCK_TYPE_LABELS, FREQUENCY_LABELS, CALENDAR_LAYER_LABELS } from '@/types/academic';
import type { BlockState, BlockType, Frequency, CalendarLayerType } from '@/types/academic';
import { Check, Clock, Calendar, X, Lock, Repeat, Layers, Shield } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface BlockNodeData {
  name: string;
  duration: number;
  active: boolean;
  color: string;
  state: BlockState;
  blockId: string;
  locked?: boolean;
  blockType?: BlockType;
  category?: string;
  frequency?: Frequency;
  layerName?: string;
  layerColor?: string;
  overrideable?: boolean;
}

const stateConfig: Record<BlockState, { label: string; icon: typeof Check; className: string }> = {
  unscheduled: { label: 'Unscheduled', icon: Clock, className: 'bg-muted text-muted-foreground' },
  scheduled: { label: 'Scheduled', icon: Calendar, className: 'bg-status-scheduled-bg text-status-scheduled' },
  confirmed: { label: 'Confirmed', icon: Check, className: 'bg-status-confirmed-bg text-status-confirmed' },
  rejected: { label: 'Rejected', icon: X, className: 'bg-status-rejected-bg text-status-rejected' },
  'on-hold': { label: 'On Hold', icon: Clock, className: 'bg-status-onhold-bg text-status-onhold' },
};

function BlockNode({ data }: { data: BlockNodeData }) {
  const store = useAcademicStore();
  const { updateBlock, selectedBlockId, setSelectedBlockId } = store;
  const template = store.getActiveTemplate();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(data.name);
  const [showColors, setShowColors] = useState(false);

  const isSelected = selectedBlockId === data.blockId;
  const config = stateConfig[data.state];
  const StateIcon = config.icon;
  const isLocked = data.locked;

  const scheduledEvent = template?.scheduledEvents.find(e => e.blockId === data.blockId);

  // Get layer info from template
  const layer = template?.layerId
    ? store.calendarLayers.find(l => l.id === template.layerId)
    : undefined;

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour12} ${ampm}`;
  };

  const handleNameClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    setEditName(data.name);
    setIsEditing(true);
  }, [data.name, isLocked]);

  const handleNameBlur = useCallback(() => {
    setIsEditing(false);
    if (editName.trim() && editName !== data.name) {
      updateBlock(data.blockId, { name: editName.trim() });
    }
  }, [editName, data.name, data.blockId, updateBlock]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
    if (e.key === 'Escape') { setEditName(data.name); setIsEditing(false); }
  }, [data.name]);

  return (
    <div
      className={`relative rounded-lg border-2 transition-all duration-200 cursor-pointer ${
        isLocked ? 'min-w-[200px]' : 'min-w-[180px]'
      } ${
        isSelected
          ? 'border-accent shadow-elevated ring-2 ring-accent/20 scale-[1.02]'
          : 'border-border shadow-card hover:shadow-card-hover hover:-translate-y-0.5'
      } ${!data.active ? 'opacity-50' : ''}`}
      style={{ backgroundColor: `hsl(${data.color} / 0.12)` }}
      onClick={() => !isLocked && setSelectedBlockId(isSelected ? null : data.blockId)}
    >
      <Handle type="target" position={Position.Top} className="!-top-[6px] !left-1/2" />
      <Handle type="source" position={Position.Bottom} className="!-bottom-[6px] !left-1/2" />

      {/* Color strip - use layer color if available */}
      <div
        className="h-1.5 rounded-t-md"
        style={{ backgroundColor: layer ? `hsl(${layer.color})` : `hsl(${data.color})` }}
      />

      <div className="px-3 py-2 space-y-1">
        {/* Name row */}
        <div className="flex items-center gap-1.5">
          {!isLocked && (
            <input
              type="checkbox"
              checked={data.active}
              onChange={(e) => {
                e.stopPropagation();
                updateBlock(data.blockId, { active: !data.active });
              }}
              className="rounded border-border w-3 h-3 accent-accent flex-shrink-0"
            />
          )}
          {isLocked && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}

          {isEditing && !isLocked ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={handleNameBlur}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-semibold bg-transparent border-b border-accent outline-none w-full font-display"
            />
          ) : (
            <span
              className={`text-xs font-semibold font-display truncate ${!isLocked ? 'cursor-text hover:border-b hover:border-muted-foreground/30' : ''} transition-colors`}
              onDoubleClick={handleNameClick}
            >
              {data.name}
            </span>
          )}
        </div>

        {/* Block Type + Category tag */}
        {!isLocked && data.blockType && data.blockType !== 'custom' && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {BLOCK_TYPE_LABELS[data.blockType]}
            </span>
            {data.category && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted/80 text-muted-foreground">
                {data.category}
              </span>
            )}
          </div>
        )}

        {/* Duration + Frequency + Color */}
        {!isLocked && (
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span>{data.duration}h</span>
              {data.frequency && data.frequency !== 'one-time' && (
                <span className="flex items-center gap-0.5 text-accent/70">
                  <Repeat className="w-2.5 h-2.5" />
                  {FREQUENCY_LABELS[data.frequency]}
                </span>
              )}
            </div>
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowColors(!showColors); }}
                className="w-3.5 h-3.5 rounded-full border border-border/50 hover:scale-110 transition-transform"
                style={{ backgroundColor: `hsl(${data.color})` }}
              />
              {showColors && (
                <div className="absolute right-0 top-5 z-50 flex gap-1 p-1.5 bg-card rounded-lg shadow-elevated border border-border animate-fade-in">
                  {BLOCK_COLORS.map((color, i) => (
                    <button
                      key={color}
                      title={BLOCK_COLOR_NAMES[i]}
                      className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 ${
                        color === data.color ? 'border-foreground' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: `hsl(${color})` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateBlock(data.blockId, { color });
                        setShowColors(false);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* State Badge + Layer badge */}
        {!isLocked && (
          <div className="flex items-center gap-1 flex-wrap">
            <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${config.className}`}>
              <StateIcon className="w-2.5 h-2.5" />
              {config.label}
            </div>
            {layer && (
              <div
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium"
                style={{
                  backgroundColor: `hsl(${layer.color} / 0.15)`,
                  color: `hsl(${layer.color.split(' ')[0]} 50% 35%)`,
                }}
              >
                <Layers className="w-2.5 h-2.5" />
                {layer.entityName}
              </div>
            )}
          </div>
        )}

        {/* Scheduled info tag */}
        {scheduledEvent && !isLocked && (
          <div className="text-[9px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
            📅 {format(parseISO(scheduledEvent.date), 'd MMM')} {formatHour(scheduledEvent.startHour)}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(BlockNode);
