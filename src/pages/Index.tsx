import { useAcademicStore } from '@/store/useAcademicStore';
import { ConfirmationEngine } from '@/components/academic/ConfirmationEngine';
import { ReferenceCalendar } from '@/components/academic/ReferenceCalendar';
import { Link } from 'react-router-dom';
import { ArrowRight, GraduationCap } from 'lucide-react';

const Index = () => {
  const template = useAcademicStore(s => s.getActiveTemplate());

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-accent" />
            <span className="font-display font-bold text-lg">AcadFlow</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground"
            >
              Confirmations
            </Link>
            <Link
              to="/planner"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex items-center gap-1"
            >
              Planner
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold font-display">
            {template ? template.name : 'Confirmation Dashboard'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {template
              ? `Review and confirm scheduled blocks (${template.academicStartDate} → ${template.academicEndDate})`
              : 'Select a template in the Planner to get started'}
          </p>
        </div>

        {/* Confirmation Questions */}
        <ConfirmationEngine />

        {/* Reference Calendar */}
        {template && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold font-display">Reference Calendar</h2>
            <ReferenceCalendar />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
