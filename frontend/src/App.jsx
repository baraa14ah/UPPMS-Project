import React, { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import DashboardLayout from "./layouts/DashboardLayout";
import { useAuth } from "./context/AuthContext";
import CustomThemeProvider from "./context/ThemeContext";
import LoadingScreen from "./components/loading/LoadingScreen";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const Notifications = lazy(() => import("./pages/Notifications"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const SupervisorInvitations = lazy(() => import("./pages/SupervisorInvitations"));
const StudentInvitations = lazy(() => import("./pages/StudentInvitations"));
const Profile = lazy(() => import("./pages/Profile"));
const Users = lazy(() => import("./pages/Users"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const AccountBlocked = lazy(() => import("./pages/AccountBlocked"));
const Universities = lazy(() => import("./pages/Universities"));
const PlatformUsers = lazy(() => import("./pages/PlatformUsers"));
const PlatformProjects = lazy(() => import("./pages/PlatformProjects"));
const PlatformDashboard = lazy(() => import("./pages/PlatformDashboard"));
const ProjectIdeation = lazy(() => import("./pages/ProjectIdeation"));
const SchedulingDashboard = lazy(() => import("./pages/SchedulingDashboard"));
const CommitteeManagement = lazy(() => import("./pages/CommitteeManagement"));
const XmlImportDashboard = lazy(() => import("./pages/XmlImportDashboard"));
const MySchedule = lazy(() => import("./pages/MySchedule"));
const ProposalSubmission = lazy(() => import("./pages/ProposalSubmission"));
const SupervisorProposalReview = lazy(() => import("./pages/SupervisorProposalReview"));
const TrackBuilder = lazy(() => import("./pages/TrackBuilder"));
const StudentProgressTimeline = lazy(() => import("./pages/StudentProgressTimeline"));

/** Routes admins to tenant Users and super admins to PlatformUsers. */
function UsersPage() {
  const { isSuperAdmin, user } = useAuth();
  const roleName = String(user?.role?.name || user?.role || "").toLowerCase();
  if (!isSuperAdmin && roleName !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return isSuperAdmin ? <PlatformUsers /> : <Users />;
}

/** Routes super admins to PlatformProjects; others to tenant Projects. */
function ProjectsPage() {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <PlatformProjects /> : <Projects />;
}

/** Guards dashboard routes behind auth, status, and session checks. */
function ProtectedRoute({ children }) {
  const { isAuthenticated, status, loadingProfile, sessionBlock } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (loadingProfile) return <LoadingScreen />;

  if (sessionBlock === "no_university") {
    return <AccountBlocked />;
  }

  if (status === "pending" || status === "rejected") {
    return <PendingApproval />;
  }

  if (!status || (status !== "active" && status !== "graduated")) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

/** Restricts a route to platform super admins only. */
function SuperAdminRoute({ children }) {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

/** Blocks super admins from tenant-only screens. */
function TenantRoute({ children }) {
  const { isSuperAdmin } = useAuth();
  if (isSuperAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

/** Restricts a route to students only. */
function StudentRoute({ children }) {
  const { role } = useAuth();
  if (role !== "student") return <Navigate to="/dashboard" replace />;
  return children;
}

/** Picks the dashboard home view based on the user role. */
function DashboardIndex() {
  const { isSuperAdmin } = useAuth();
  if (isSuperAdmin) return <PlatformDashboard />;
  return <Dashboard />;
}

/** Blocks university admins from student/supervisor-only invitation screens. */
function InvitationRoute({ children, allowedRole }) {
  const { role } = useAuth();
  const roleName = String(role || "").toLowerCase();
  if (roleName === "admin") return <Navigate to="/dashboard" replace />;
  if (roleName !== allowedRole) return <Navigate to="/dashboard" replace />;
  return children;
}

/** Restricts a route to university admins only. */
function AdminRoute({ children }) {
  const { role } = useAuth();
  if (String(role || "").toLowerCase() !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

/** Restricts a route to supervisors and admins. */
function FacultyScheduleRoute({ children }) {
  const { role } = useAuth();
  const roleName = String(role || "").toLowerCase();
  if (!["supervisor", "admin"].includes(roleName)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

/** Restricts proposal review to supervisors and university admins. */
function ProposalReviewRoute({ children }) {
  const { role } = useAuth();
  const roleName = String(role || "").toLowerCase();
  if (!["supervisor", "admin"].includes(roleName)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

/** Root router: public auth pages and protected dashboard routes. */
export default function App() {
  return (
    <CustomThemeProvider>
      <Toaster position="top-center" reverseOrder={false} />

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<Navigate to="/forgot-password" replace />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardIndex />} />
          <Route
            path="universities"
            element={
              <SuperAdminRoute>
                <Universities />
              </SuperAdminRoute>
            }
          />
          <Route path="profile" element={<Profile />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:id" element={<ProjectDetails />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="users" element={<UsersPage />} />
          <Route
            path="supervisor/invitations"
            element={
              <TenantRoute>
                <InvitationRoute allowedRole="supervisor">
                  <SupervisorInvitations />
                </InvitationRoute>
              </TenantRoute>
            }
          />
          <Route
            path="student/invitations"
            element={
              <TenantRoute>
                <InvitationRoute allowedRole="student">
                  <StudentInvitations />
                </InvitationRoute>
              </TenantRoute>
            }
          />
          <Route
            path="ideation"
            element={
              <TenantRoute>
                <StudentRoute>
                  <ProjectIdeation />
                </StudentRoute>
              </TenantRoute>
            }
          />
          <Route
            path="proposals"
            element={
              <TenantRoute>
                <StudentRoute>
                  <ProposalSubmission />
                </StudentRoute>
              </TenantRoute>
            }
          />
          <Route
            path="my-progress"
            element={
              <TenantRoute>
                <StudentRoute>
                  <StudentProgressTimeline />
                </StudentRoute>
              </TenantRoute>
            }
          />
          <Route
            path="proposal-review"
            element={
              <TenantRoute>
                <ProposalReviewRoute>
                  <SupervisorProposalReview />
                </ProposalReviewRoute>
              </TenantRoute>
            }
          />
          <Route
            path="university"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route
            path="scheduling"
            element={
              <TenantRoute>
                <AdminRoute>
                  <SchedulingDashboard />
                </AdminRoute>
              </TenantRoute>
            }
          />
          <Route
            path="committees"
            element={
              <TenantRoute>
                <AdminRoute>
                  <CommitteeManagement />
                </AdminRoute>
              </TenantRoute>
            }
          />
          <Route
            path="tracks"
            element={
              <TenantRoute>
                <AdminRoute>
                  <TrackBuilder />
                </AdminRoute>
              </TenantRoute>
            }
          />
          <Route
            path="xml-import"
            element={
              <TenantRoute>
                <AdminRoute>
                  <XmlImportDashboard />
                </AdminRoute>
              </TenantRoute>
            }
          />
          <Route
            path="my-schedule"
            element={
              <TenantRoute>
                <FacultyScheduleRoute>
                  <MySchedule />
                </FacultyScheduleRoute>
              </TenantRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </CustomThemeProvider>
  );
}
