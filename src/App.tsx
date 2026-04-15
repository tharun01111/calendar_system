import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Planner from "./pages/Planner";
import RulesetSetup from "./pages/RulesetSetup";
import Confirmations from "./pages/Confirmations";
import CalendarEditor from "./pages/CalendarEditor";
import FinalCalendar from "./pages/FinalCalendar";
import FinalizeFlow from "./pages/FinalizeFlow";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: ('super_admin' | 'admin')[] }) {
  const { user, role, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={role === 'super_admin' ? '/planner' : '/dashboard'} replace />;
  }
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
    <Route path="/planner" element={<ProtectedRoute allowedRoles={['super_admin']}><Planner /></ProtectedRoute>} />
    <Route path="/ruleset" element={<ProtectedRoute allowedRoles={['admin']}><RulesetSetup /></ProtectedRoute>} />
    <Route path="/confirmations" element={<ProtectedRoute allowedRoles={['admin']}><Confirmations /></ProtectedRoute>} />
    <Route path="/calendar" element={<ProtectedRoute allowedRoles={['admin']}><CalendarEditor /></ProtectedRoute>} />
    <Route path="/finalize/:flowId" element={<ProtectedRoute allowedRoles={['admin']}><FinalizeFlow /></ProtectedRoute>} />
    <Route path="/final-calendar" element={<ProtectedRoute allowedRoles={['admin']}><FinalCalendar /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
