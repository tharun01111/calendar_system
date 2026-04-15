export type BlockState = 'unscheduled' | 'scheduled' | 'confirmed' | 'rejected' | 'on-hold';

export type BlockType =
  | 'academic'
  | 'staff-meeting'
  | 'compliance'
  | 'audit'
  | 'survey'
  | 'administrative'
  | 'student'
  | 'custom';

export type Frequency =
  | 'one-time'
  | 'monthly'
  | 'bi-monthly'
  | 'quarterly'
  | 'every-6-months'
  | 'yearly'
  | 'custom';

// ─── Calendar Layers ─────────────────────────────────────────────

export type CalendarLayerType =
  | 'institution'
  | 'faculty'
  | 'department'
  | 'program'
  | 'batch'
  | 'section';

export const CALENDAR_LAYER_LABELS: Record<CalendarLayerType, string> = {
  institution: 'Institution',
  faculty: 'Faculty',
  department: 'Department',
  program: 'Program',
  batch: 'Batch',
  section: 'Section',
};

export const CALENDAR_LAYER_COLORS: Record<CalendarLayerType, string> = {
  institution: '270 60% 65%',
  faculty: '230 65% 60%',
  department: '210 70% 60%',
  program: '175 55% 48%',
  batch: '145 55% 50%',
  section: '25 80% 55%',
};

export interface CalendarLayer {
  id: string;
  type: CalendarLayerType;
  entityName: string; // e.g., "ECE", "2026", "Section A"
  enabled: boolean;
  color: string; // HSL value
}

// ─── Block Type Config ───────────────────────────────────────────

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  academic: 'Academic Activity',
  'staff-meeting': 'Staff Meeting',
  compliance: 'Compliance Activity',
  audit: 'Audit Preparation',
  survey: 'Survey / Data Submission',
  administrative: 'Administrative Task',
  student: 'Student Activity',
  custom: 'Custom',
};

export const BLOCK_TYPE_COLORS: Record<BlockType, string> = {
  academic: '210 70% 72%',
  'staff-meeting': '270 55% 75%',
  compliance: '0 65% 72%',
  audit: '30 80% 70%',
  survey: '145 55% 68%',
  administrative: '220 12% 72%',
  student: '175 55% 65%',
  custom: '40 80% 78%',
};

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  'one-time': 'One Time',
  monthly: 'Monthly',
  'bi-monthly': 'Bi-Monthly',
  quarterly: 'Every 3 Months',
  'every-6-months': 'Every 6 Months',
  yearly: 'Yearly',
  custom: 'Custom',
};

// ─── Block / Event / Template Types ──────────────────────────────

export interface Block {
  id: string;
  name: string;
  duration: number; // hours
  active: boolean;
  color: string;
  state: BlockState;
  position: { x: number; y: number };
  locked?: boolean;
  blockType?: BlockType;
  category?: string;
  frequency?: Frequency;
  responsiblePerson?: string;
  notes?: string;
  reminder?: string;
  overrideable?: boolean;
}

export interface Connection {
  id: string;
  source: string;
  target: string;
}

export interface ScheduledEvent {
  id: string;
  blockId: string;
  date: string; // YYYY-MM-DD
  startHour: number;
  endHour: number;
  templateId?: string; // which template generated this
  layerId?: string;    // which calendar layer this belongs to
}

export interface Template {
  id: string;
  name: string;
  description: string;
  academicStartDate: string; // YYYY-MM-DD
  academicEndDate: string;
  blocks: Block[];
  connections: Connection[];
  scheduledEvents: ScheduledEvent[];
  layerId?: string;          // assigned calendar layer
  layerType?: CalendarLayerType;
  layerEntityName?: string;  // e.g., "ECE", "2026"
}

export const BLOCK_COLORS = [
  '0 70% 80%',
  '200 70% 80%',
  '160 50% 78%',
  '260 50% 82%',
  '40 80% 78%',
  '320 50% 80%',
];

export const BLOCK_COLOR_NAMES = ['Coral', 'Sky', 'Mint', 'Lavender', 'Amber', 'Rose'];

// ─── Activity Category Definitions ───────────────────────────────

export interface ActivityCategory {
  name: string;
  items: string[];
  frequency: Frequency;
  frequencyNote?: string;
}

export interface CategoryGroup {
  groupName: string;
  categories: ActivityCategory[];
}

export const ACTIVITY_CATEGORIES: CategoryGroup[] = [
  {
    groupName: 'Compliance Activities',
    categories: [
      {
        name: 'Anna University (AU)',
        items: [
          'AU Affiliation Portal Entry',
          'AU Affiliation Verification and Modification',
          'AU Affiliation Mock Audit',
          'AU Affiliation Expert Visit',
        ],
        frequency: 'yearly',
      },
      {
        name: 'AICTE',
        items: [
          'AICTE Portal Entry',
          'AICTE Verification and Modification',
          'AICTE Mock Audit 1',
          'AICTE Scrutiny Visit',
          'AICTE Mock Audit 2',
          'AICTE Expert Visit',
        ],
        frequency: 'yearly',
      },
      {
        name: 'AISHE',
        items: ['AISHE Survey Submission'],
        frequency: 'yearly',
      },
      {
        name: 'DoTE',
        items: [
          'UMIS ID Submission',
          'Student Approval (UG, PG, Lateral)',
          'Fee Fixation Committee Follow-up',
        ],
        frequency: 'yearly',
        frequencyNote: 'Fee Fixation every 3 years',
      },
    ],
  },
  {
    groupName: 'Governance Meetings',
    categories: [
      {
        name: 'Governing Council Meeting',
        items: [
          'Agenda Initiate',
          'Agenda Vetting',
          'Meeting Conduction',
          'Minutes Preparation and Circulation',
        ],
        frequency: 'every-6-months',
      },
    ],
  },
  {
    groupName: 'IQAC Activities',
    categories: [
      {
        name: 'IQAC Meeting',
        items: ['IQAC Meeting'],
        frequency: 'quarterly',
      },
    ],
  },
];

// ─── Template Presets ────────────────────────────────────────────

export interface TemplatePreset {
  id: string;
  name: string;
  description: string;
  blockType: BlockType;
  blocks: { name: string; category?: string; frequency?: Frequency; offsetDays?: number }[];
  hasOffsetRules?: boolean;
}

export const TEMPLATE_PRESETS: TemplatePreset[] = [
  {
    id: 'aicte-compliance',
    name: 'AICTE Compliance Flow',
    description: 'Complete AICTE compliance workflow with portal entries, audits, and expert visits',
    blockType: 'compliance',
    blocks: [
      { name: 'AICTE Portal Entry', category: 'AICTE', frequency: 'yearly', offsetDays: 0 },
      { name: 'AICTE Verification and Modification', category: 'AICTE', frequency: 'yearly', offsetDays: 30 },
      { name: 'AICTE Mock Audit 1', category: 'AICTE', frequency: 'yearly', offsetDays: 60 },
      { name: 'AICTE Scrutiny Visit', category: 'AICTE', frequency: 'yearly', offsetDays: 90 },
      { name: 'AICTE Mock Audit 2', category: 'AICTE', frequency: 'yearly', offsetDays: 120 },
      { name: 'AICTE Expert Visit', category: 'AICTE', frequency: 'yearly', offsetDays: 150 },
    ],
    hasOffsetRules: true,
  },
  {
    id: 'naac-accreditation',
    name: 'NAAC Accreditation Flow',
    description: 'Full NAAC accreditation process from data collection to expert visit',
    blockType: 'compliance',
    blocks: [
      { name: 'Data Collection', category: 'NAAC', frequency: 'one-time', offsetDays: 0 },
      { name: 'Data Review', category: 'NAAC', frequency: 'one-time', offsetDays: 30 },
      { name: 'Corrections Deadline', category: 'NAAC', frequency: 'one-time', offsetDays: 45 },
      { name: 'Portal Entry Deadline', category: 'NAAC', frequency: 'one-time', offsetDays: 60 },
      { name: 'Final Data Review', category: 'NAAC', frequency: 'one-time', offsetDays: 75 },
      { name: 'Submission', category: 'NAAC', frequency: 'one-time', offsetDays: 90 },
      { name: 'IIQA Submission', category: 'NAAC Stage 2', frequency: 'one-time', offsetDays: 120 },
      { name: 'SSR Initiation', category: 'NAAC Stage 2', frequency: 'one-time', offsetDays: 135 },
      { name: 'SSR Completion', category: 'NAAC Stage 2', frequency: 'one-time', offsetDays: 165 },
      { name: 'SSR Submission', category: 'NAAC Stage 2', frequency: 'one-time', offsetDays: 180 },
      { name: 'Submission After DVV', category: 'NAAC Stage 2', frequency: 'one-time', offsetDays: 210 },
      { name: 'Pre Visit Preparation', category: 'NAAC Stage 2', frequency: 'one-time', offsetDays: 240 },
      { name: 'Expert Visit', category: 'NAAC Stage 2', frequency: 'one-time', offsetDays: 270 },
      { name: 'Results Declaration', category: 'NAAC Stage 2', frequency: 'one-time', offsetDays: 300 },
    ],
    hasOffsetRules: true,
  },
  {
    id: 'nba-accreditation',
    name: 'NBA Accreditation Flow',
    description: 'NBA accreditation from prequalifier to expert visit',
    blockType: 'audit',
    blocks: [
      { name: 'Prequalifier Preparation', category: 'NBA', frequency: 'one-time', offsetDays: 0 },
      { name: 'Prequalifier Review', category: 'NBA', frequency: 'one-time', offsetDays: 20 },
      { name: 'Application Creation', category: 'NBA', frequency: 'one-time', offsetDays: 35 },
      { name: 'Prequalifier Submission', category: 'NBA', frequency: 'one-time', offsetDays: 50 },
      { name: 'SAR Submission', category: 'NBA', frequency: 'one-time', offsetDays: 80 },
      { name: 'Mock Audit 1', category: 'NBA', frequency: 'one-time', offsetDays: 100 },
      { name: 'Mock Audit 2', category: 'NBA', frequency: 'one-time', offsetDays: 120 },
      { name: 'Mock Audit 3', category: 'NBA', frequency: 'one-time', offsetDays: 140 },
      { name: 'Final Mock Audit', category: 'NBA', frequency: 'one-time', offsetDays: 160 },
      { name: 'Principal Presentation', category: 'NBA', frequency: 'one-time', offsetDays: 170 },
      { name: 'Institute Specific Files', category: 'NBA', frequency: 'one-time', offsetDays: 180 },
      { name: 'Expert Visit', category: 'NBA', frequency: 'one-time', offsetDays: 200 },
    ],
    hasOffsetRules: true,
  },
  {
    id: 'iqac-activities',
    name: 'IQAC Activities',
    description: 'Quarterly IQAC meetings (Sep, Dec, Mar, Jun)',
    blockType: 'staff-meeting',
    blocks: [
      { name: 'IQAC Meeting – September', category: 'IQAC', frequency: 'quarterly' },
      { name: 'IQAC Meeting – December', category: 'IQAC', frequency: 'quarterly' },
      { name: 'IQAC Meeting – March', category: 'IQAC', frequency: 'quarterly' },
      { name: 'IQAC Meeting – June', category: 'IQAC', frequency: 'quarterly' },
    ],
  },
  {
    id: 'academic-admin',
    name: 'Academic Administration',
    description: 'General academic administration tasks and activities',
    blockType: 'administrative',
    blocks: [
      { name: 'Academic Calendar Planning', category: 'Administration', frequency: 'yearly', offsetDays: 0 },
      { name: 'Faculty Workload Distribution', category: 'Administration', frequency: 'every-6-months', offsetDays: 15 },
      { name: 'Timetable Preparation', category: 'Administration', frequency: 'every-6-months', offsetDays: 25 },
      { name: 'Examination Schedule', category: 'Administration', frequency: 'every-6-months', offsetDays: 40 },
    ],
    hasOffsetRules: true,
  },
  {
    id: 'gc-meeting',
    name: 'Governing Council Meeting Flow',
    description: 'GC meeting workflow from agenda to minutes (every 6 months)',
    blockType: 'staff-meeting',
    blocks: [
      { name: 'GC Meeting 1 – Agenda Initiate', category: 'Governance', frequency: 'every-6-months', offsetDays: 0 },
      { name: 'GC Meeting 1 – Agenda Vetting', category: 'Governance', frequency: 'every-6-months', offsetDays: 7 },
      { name: 'GC Meeting 1 – Meeting Conduction', category: 'Governance', frequency: 'every-6-months', offsetDays: 14 },
      { name: 'GC Meeting 1 – Minutes Preparation', category: 'Governance', frequency: 'every-6-months', offsetDays: 21 },
      { name: 'GC Meeting 2 – Agenda Initiate', category: 'Governance', frequency: 'every-6-months', offsetDays: 180 },
      { name: 'GC Meeting 2 – Agenda Vetting', category: 'Governance', frequency: 'every-6-months', offsetDays: 187 },
      { name: 'GC Meeting 2 – Meeting Conduction', category: 'Governance', frequency: 'every-6-months', offsetDays: 194 },
      { name: 'GC Meeting 2 – Minutes Preparation', category: 'Governance', frequency: 'every-6-months', offsetDays: 201 },
    ],
    hasOffsetRules: true,
  },
  {
    id: 'student-activities',
    name: 'Student Activities',
    description: 'Student-facing events and activities',
    blockType: 'student',
    blocks: [
      { name: 'Student Satisfaction Survey', category: 'Student', frequency: 'every-6-months', offsetDays: 0 },
      { name: 'Alumni Meet', category: 'Student', frequency: 'yearly', offsetDays: 60 },
      { name: 'Cultural Fest', category: 'Student', frequency: 'yearly', offsetDays: 120 },
      { name: 'Technical Symposium', category: 'Student', frequency: 'yearly', offsetDays: 150 },
    ],
    hasOffsetRules: true,
  },
  {
    id: 'institutional-governance',
    name: 'Institutional Governance',
    description: 'Complete institutional governance and compliance activities',
    blockType: 'compliance',
    blocks: [
      { name: 'AU Affiliation Portal Entry', category: 'AU', frequency: 'yearly', offsetDays: 0 },
      { name: 'AU Affiliation Verification', category: 'AU', frequency: 'yearly', offsetDays: 30 },
      { name: 'AISHE Survey Submission', category: 'AISHE', frequency: 'yearly', offsetDays: 60 },
      { name: 'UMIS ID Submission', category: 'DoTE', frequency: 'yearly', offsetDays: 90 },
      { name: 'Student Approval (UG, PG, Lateral)', category: 'DoTE', frequency: 'yearly', offsetDays: 120 },
      { name: 'Consultancy Review', category: 'Administration', frequency: 'quarterly', offsetDays: 150 },
    ],
    hasOffsetRules: true,
  },
  {
    id: 'odd-semester-exam',
    name: 'Odd Semester Exam Schedule',
    description: 'Auto-scheduled exam flow: PT1 → PT2 → Model → Practical → Semester',
    blockType: 'academic',
    blocks: [
      { name: 'PT1', category: 'Examination', frequency: 'every-6-months', offsetDays: 30 },
      { name: 'PT2', category: 'Examination', frequency: 'every-6-months', offsetDays: 60 },
      { name: 'Model Exam', category: 'Examination', frequency: 'every-6-months', offsetDays: 80 },
      { name: 'Practical', category: 'Examination', frequency: 'every-6-months', offsetDays: 87 },
      { name: 'Semester Exam', category: 'Examination', frequency: 'every-6-months', offsetDays: 92 },
    ],
    hasOffsetRules: true,
  },
  {
    id: 'even-semester-exam',
    name: 'Even Semester Exam Schedule',
    description: 'Auto-scheduled exam flow for even semester',
    blockType: 'academic',
    blocks: [
      { name: 'PT1', category: 'Examination', frequency: 'every-6-months', offsetDays: 30 },
      { name: 'PT2', category: 'Examination', frequency: 'every-6-months', offsetDays: 60 },
      { name: 'Model Exam', category: 'Examination', frequency: 'every-6-months', offsetDays: 80 },
      { name: 'Practical', category: 'Examination', frequency: 'every-6-months', offsetDays: 87 },
      { name: 'Semester Exam', category: 'Examination', frequency: 'every-6-months', offsetDays: 92 },
    ],
    hasOffsetRules: true,
  },
];
