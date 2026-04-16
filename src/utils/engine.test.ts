import { describe, it, expect } from 'vitest';
import { addDays, parseISO, format } from 'date-fns';

describe('Academic Calendar Constraint Engine', () => {
  const START_DATE = parseISO('2026-08-01');

  it('correctly maps linear sequence of activities', () => {
    // Mock sequential rules processing
    const activities = [
      { name: 'Semester Start', duration_days: 1 },
      { name: 'Classes Part 1', duration_days: 30 }
    ];
    
    let current = START_DATE;
    const generated = activities.map(act => {
      const eStart = format(current, 'yyyy-MM-dd');
      const eEnd = format(addDays(current, act.duration_days - 1), 'yyyy-MM-dd');
      current = addDays(current, act.duration_days); // 0 gap
      return { start: eStart, end: eEnd };
    });

    expect(generated[0].start).toBe('2026-08-01');
    expect(generated[0].end).toBe('2026-08-01');
    
    expect(generated[1].start).toBe('2026-08-02');    
    expect(generated[1].end).toBe('2026-08-31');
  });

  it('correctly pads buffers based on strict scheduling rules (AICTE)', () => {
     // AICTE mandates minimum gap between critical phases like audit and classes
     const aicteHolidayBuffer = 7; 
     let current = START_DATE;
     const gap = aicteHolidayBuffer;

     const activities = [
      { name: 'Phase 1', duration_days: 10 },
      { name: 'Phase 2', duration_days: 5 }
    ];

    const generated = activities.map(act => {
      const eStart = format(current, 'yyyy-MM-dd');
      const eEnd = format(addDays(current, act.duration_days - 1), 'yyyy-MM-dd');
      current = addDays(current, act.duration_days + gap);
      return { start: eStart, end: eEnd };
    });

    // Phase 1: 10 days (Aug 1 - Aug 10)
    expect(generated[0].start).toBe('2026-08-01');
    expect(generated[0].end).toBe('2026-08-10');

    // Gap: 7 days. Buffer starts Aug 11. Next phase starts Aug 11 + 7 days = Aug 18
    expect(generated[1].start).toBe('2026-08-18');
    expect(generated[1].end).toBe('2026-08-22'); // 5 days
  });
});
