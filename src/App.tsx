import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@components/layout/AppShell';
import { ProtectedRoute } from '@components/layout/ProtectedRoute';
import { AdminShell } from '@components/admin/AdminShell';
import { getAppMode } from '@/utils/mode';

// Client-side pages
const Login = lazy(() => import('@pages/Login'));
const ForgotPassword = lazy(() => import('@pages/ForgotPassword'));
const Overview = lazy(() => import('@pages/Overview'));
const Inbox = lazy(() => import('@pages/Inbox'));
const Contacts = lazy(() => import('@pages/Contacts'));
const Campaigns = lazy(() => import('@pages/Campaigns'));
const SavedReplies = lazy(() => import('@pages/SavedReplies'));
const Team = lazy(() => import('@pages/Team'));
const Roles = lazy(() => import('@pages/Roles'));
const Channels = lazy(() => import('@pages/Channels'));
const ChannelDetail = lazy(() => import('@pages/ChannelDetail'));
const Departments = lazy(() => import('@pages/Departments'));
const Reports = lazy(() => import('@pages/Reports'));
const Settings = lazy(() => import('@pages/Settings'));
const Subscribe = lazy(() => import('@pages/Subscribe'));
const Billing = lazy(() => import('@pages/Billing'));
const Notifications = lazy(() => import('@pages/Notifications'));
const AISettings = lazy(() => import('@pages/AISettings'));
const KnowledgeBase = lazy(() => import('@pages/KnowledgeBase'));
const Feedback = lazy(() => import('@pages/Feedback'));
const Tags = lazy(() => import('@pages/Tags'));

// Admin pages
const AdminDashboard = lazy(() => import('@pages/admin/Dashboard'));
const AdminClients = lazy(() => import('@pages/admin/Clients'));
const AdminPlans = lazy(() => import('@pages/admin/Plans'));
const AdminFinance = lazy(() => import('@pages/admin/Finance'));
const AdminPayments = lazy(() => import('@pages/admin/Payments'));
const AdminReports = lazy(() => import('@pages/admin/Reports'));
const AdminSettings = lazy(() => import('@pages/admin/Settings'));

function PageLoader(): JSX.Element {
  return (
    <div className="flex items-center justify-center h-screen p-12">
      <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );
}

export default function App(): JSX.Element {
  const mode = getAppMode();

  if (mode === 'admin') {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            element={
              <ProtectedRoute>
                <AdminShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/clients" element={<AdminClients />} />
            <Route path="/plans" element={<AdminPlans />} />
            <Route path="/finance" element={<AdminFinance />} />
            <Route path="/payments" element={<AdminPayments />} />
            <Route path="/reports" element={<AdminReports />} />
            <Route path="/settings" element={<AdminSettings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Suspense>
    );
  }

  // Client mode
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/channels" element={<Channels />} />
          <Route path="/channels/:type" element={<ChannelDetail />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/saved-replies" element={<SavedReplies />} />
          <Route path="/templates" element={<Navigate to="/saved-replies" replace />} />
          <Route path="/team" element={<Team />} />
          <Route path="/team/roles" element={<Roles />} />
          <Route path="/integrations" element={<Navigate to="/channels" replace />} />
          <Route path="/widget" element={<Navigate to="/channels/widget" replace />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/billing" element={<Billing />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/ai-settings" element={<AISettings />} />
          <Route path="/knowledge-base" element={<KnowledgeBase />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/tags" element={<Tags />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
