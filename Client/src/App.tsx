import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { isApiBaseUrlConfigured } from "@/lib/api";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import JobsPage from "./pages/JobsPage";
import JobDetailPage from "./pages/JobDetailPage";
import CreateJobPage from "./pages/CreateJobPage";
import CandidatesPage from "./pages/CandidatesPage";
import CreateCandidatePage from "./pages/CreateCandidatePage";
import CreateOfferPage from "./pages/CreateOfferPage";
import CandidateDetailPage from "./pages/CandidateDetailPage";
import PipelinePage from "./pages/PipelinePage";
import InterviewsPage from "./pages/InterviewsPage";
import OffersPage from "./pages/OffersPage";
import OfferDetailPage from "./pages/OfferDetailPage";
import PublicOfferPage from "./pages/PublicOfferPage";
import ScheduleInterviewPage from "./pages/ScheduleInterviewPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AuditLogPage from "./pages/AuditLogPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";
import ProfilePage from "./pages/ProfilePage";
import JobApplicationPage from "./pages/JobApplicationPage";
import CandidateStatusPage from "./pages/CandidateStatusPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const MissingApiConfig = () => (
  <div className="min-h-screen flex items-center justify-center bg-background px-6">
    <div className="max-w-lg rounded-xl border bg-card p-8 text-center shadow-lg">
      <h1 className="text-2xl font-semibold">Frontend setup incomplete</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Set <span className="font-medium">VITE_API_BASE_URL</span> in your Vercel project settings so the app can reach the AWS backend.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Example: <span className="font-medium">https://your-backend-domain.com/api</span>
      </p>
    </div>
  </div>
);

const App = () => (
  import.meta.env.PROD && !isApiBaseUrlConfigured ? (
    <MissingApiConfig />
  ) : (
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
              <Route path="/signup" element={<Navigate to="/login" replace />} />
              <Route path="/register" element={<Navigate to="/login" replace />} />
              <Route path="/apply/:jobId" element={<JobApplicationPage />} />
              <Route path="/status/:token" element={<CandidateStatusPage />} />
              <Route path="/offers/:token" element={<PublicOfferPage />} />

              <Route element={<ProtectedRoute />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/jobs/:jobId" element={<JobDetailPage />} />
                  <Route path="/candidates" element={<CandidatesPage />} />
                  <Route path="/candidates/:candidateId" element={<CandidateDetailPage />} />
                  <Route path="/pipeline" element={<PipelinePage />} />
                  <Route path="/pipeline/:jobId" element={<PipelinePage />} />
                  <Route path="/interviews" element={<InterviewsPage />} />

                  <Route element={<ProtectedRoute allowedRoles={["recruiter", "admin"]} />}>
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/offers" element={<OffersPage />} />
                    <Route path="/offers/view/:offerId" element={<OfferDetailPage />} />
                    <Route path="/offers/new" element={<CreateOfferPage />} />
                    <Route path="/offers/:offerId/edit" element={<CreateOfferPage />} />
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
  )
);

export default App;
