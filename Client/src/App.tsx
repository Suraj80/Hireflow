import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import JobsPage from "./pages/JobsPage";
import CreateJobPage from "./pages/CreateJobPage";
import CandidatesPage from "./pages/CandidatesPage";
import CreateCandidatePage from "./pages/CreateCandidatePage";
import CandidateDetailPage from "./pages/CandidateDetailPage";
import PipelinePage from "./pages/PipelinePage";
import InterviewsPage from "./pages/InterviewsPage";
import ScheduleInterviewPage from "./pages/ScheduleInterviewPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AuditLogPage from "./pages/AuditLogPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
import JobApplicationPage from "./pages/JobApplicationPage";
import CandidateStatusPage from "./pages/CandidateStatusPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* Public */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/apply/:jobId" element={<JobApplicationPage />} />
              <Route path="/status/:token" element={<CandidateStatusPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/candidates" element={<CandidatesPage />} />
                  <Route path="/candidates/:candidateId" element={<CandidateDetailPage />} />
                  <Route path="/pipeline" element={<PipelinePage />} />
                  <Route path="/pipeline/:jobId" element={<PipelinePage />} />
                  <Route path="/interviews" element={<InterviewsPage />} />

                  <Route element={<ProtectedRoute allowedRoles={["recruiter", "admin"]} />}>
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/interviews/new" element={<ScheduleInterviewPage />} />
                    <Route path="/jobs/new" element={<CreateJobPage />} />
                    <Route path="/jobs/:jobId/edit" element={<CreateJobPage />} />
                    <Route path="/candidates/new" element={<CreateCandidatePage />} />
                    <Route path="/candidates/:candidateId/edit" element={<CreateCandidatePage />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/audit-log" element={<AuditLogPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
