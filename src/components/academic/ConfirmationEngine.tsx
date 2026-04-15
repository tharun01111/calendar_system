import { useMemo, useState } from 'react';
import { useAcademicStore } from '@/store/useAcademicStore';
import { format, parseISO } from 'date-fns';
import { Check, X, Clock, ChevronRight, BarChart3 } from 'lucide-react';
import type { BlockState } from '@/types/academic';

export function ConfirmationEngine() {
  const store = useAcademicStore();
  const template = store.getActiveTemplate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const confirmableBlocks = useMemo(() => {
    if (!template) return [];
    return template.blocks
      .filter(b => b.active && b.state !== 'unscheduled')
      .map(block => {
        const event = template.scheduledEvents.find(e => e.blockId === block.id);
        return { block, event };
      })
      .filter(item => item.event);
  }, [template]);

  const confirmedCount = confirmableBlocks.filter(
    ({ block }) => block.state === 'confirmed' || block.state === 'rejected' || block.state === 'on-hold'
  ).length;

  const progress = confirmableBlocks.length > 0
    ? (confirmedCount / confirmableBlocks.length) * 100
    : 0;

  const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour12}:00 ${ampm}`;
  };

  const handleAnswer = (blockId: string, status: BlockState) => {
    store.setConfirmationStatus(blockId, status);
    if (currentIndex < confirmableBlocks.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (!template) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-2">
          <div className="text-4xl">📋</div>
          <h3 className="font-display font-semibold">No Active Template</h3>
          <p className="text-sm text-muted-foreground">Go to the Planner to create and schedule blocks</p>
        </div>
      </div>
    );
  }

  if (confirmableBlocks.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center space-y-2">
          <div className="text-4xl">📅</div>
          <h3 className="font-display font-semibold">No Scheduled Blocks</h3>
          <p className="text-sm text-muted-foreground">Schedule blocks in the Planner first to generate confirmation questions</p>
        </div>
      </div>
    );
  }

  const currentItem = confirmableBlocks[currentIndex];

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="bg-card rounded-xl border border-border p-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium">Confirmation Progress</span>
          </div>
          <span className="text-sm font-semibold font-display">
            {confirmedCount} / {confirmableBlocks.length} ({Math.round(progress)}%)
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current Question */}
      <div className="bg-card rounded-xl border border-border p-6 shadow-card animate-slide-in" key={currentItem.block.id}>
        <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
          <span>Question {currentIndex + 1} of {confirmableBlocks.length}</span>
        </div>
        <h3 className="text-base font-semibold font-display mb-4">
          Confirm that <span className="text-accent">{currentItem.block.name}</span> is scheduled on{' '}
          <span className="text-accent">{format(parseISO(currentItem.event!.date), 'dd MMM yyyy')}</span> from{' '}
          <span className="text-accent">{formatHour(currentItem.event!.startHour)}</span> to{' '}
          <span className="text-accent">{formatHour(currentItem.event!.endHour)}</span>?
        </h3>

        <div className="flex gap-3">
          <button
            onClick={() => handleAnswer(currentItem.block.id, 'confirmed')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
              currentItem.block.state === 'confirmed'
                ? 'bg-status-confirmed-bg border-status-confirmed text-status-confirmed'
                : 'border-border hover:border-status-confirmed hover:bg-status-confirmed-bg'
            }`}
          >
            <Check className="w-4 h-4" />
            Yes
          </button>
          <button
            onClick={() => handleAnswer(currentItem.block.id, 'rejected')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
              currentItem.block.state === 'rejected'
                ? 'bg-status-rejected-bg border-status-rejected text-status-rejected'
                : 'border-border hover:border-status-rejected hover:bg-status-rejected-bg'
            }`}
          >
            <X className="w-4 h-4" />
            No
          </button>
          <button
            onClick={() => handleAnswer(currentItem.block.id, 'on-hold')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all border-2 ${
              currentItem.block.state === 'on-hold'
                ? 'bg-status-onhold-bg border-status-onhold text-status-onhold'
                : 'border-border hover:border-status-onhold hover:bg-status-onhold-bg'
            }`}
          >
            <Clock className="w-4 h-4" />
            On Hold
          </button>
        </div>
      </div>

      {/* Question List */}
      <div className="space-y-2">
        {confirmableBlocks.map(({ block, event }, idx) => {
          const stateStyle: Record<string, string> = {
            confirmed: 'bg-status-confirmed-bg text-status-confirmed border-status-confirmed/30',
            rejected: 'bg-status-rejected-bg text-status-rejected border-status-rejected/30',
            'on-hold': 'bg-status-onhold-bg text-status-onhold border-status-onhold/30',
            scheduled: 'bg-muted text-muted-foreground border-border',
          };

          return (
            <button
              key={block.id}
              onClick={() => setCurrentIndex(idx)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-all ${
                idx === currentIndex ? 'ring-2 ring-accent/20' : ''
              } ${stateStyle[block.state] || stateStyle.scheduled}`}
            >
              <span className="font-medium">{block.name}</span>
              <div className="flex items-center gap-2">
                {event && (
                  <span className="text-xs">{format(parseISO(event.date), 'MMM d')}</span>
                )}
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
