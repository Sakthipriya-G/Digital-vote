import React from 'react';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { PollBotPanel } from './components/PollBotWidget';
import { AppProvider, useApp } from './context/AppContext';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ApplicationsAndTrackingPage } from './pages/ApplicationsAndTrackingPage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { CandidatesPage, PartiesPage } from './pages/CandidatesAndPartiesPage';
import { ElectionInfoPage, HelpCentrePage } from './pages/HelpAndInfoPage';
import { HomePage } from './pages/HomePage';
import { OfficerDashboardPage } from './pages/OfficerDashboardPage';
import { PollingStationsPage } from './pages/PollingStationsPage';
import { SuperAdminDashboardPage } from './pages/SuperAdminDashboardPage';
import { VerificationPortalPage } from './pages/VerificationPortalPage';
import { VoterDashboardPage } from './pages/VoterDashboardPage';

function PortalShell() {
  const { route, authLoading } = useApp();

  const renderPage = () => {
    if (authLoading && ['voter-dashboard', 'officer-dashboard', 'admin-dashboard', 'super-admin-dashboard'].includes(route)) {
      return (
        <div className="mx-auto max-w-[1440px] px-4 py-16 text-center text-sm text-slate-500">
          Verifying session...
        </div>
      );
    }

    switch (route) {
      case 'services':
        return <ApplicationsAndTrackingPage />;
      case 'candidates':
        return <CandidatesPage />;
      case 'parties':
        return <PartiesPage />;
      case 'polling-stations':
        return <PollingStationsPage />;
      case 'election-info':
        return <ElectionInfoPage />;
      case 'help-centre':
        return <HelpCentrePage />;
      case 'verification':
        return <VerificationPortalPage />;
      case 'login':
        return <LoginPage />;
      case 'register':
        return <RegisterPage />;
      case 'voter-dashboard':
        return <VoterDashboardPage />;
      case 'officer-dashboard':
        return <OfficerDashboardPage />;
      case 'admin-dashboard':
        return <AdminDashboardPage />;
      case 'super-admin-dashboard':
        return <SuperAdminDashboardPage />;
      case 'home':
      default:
        return <HomePage />;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <Navbar />
      <main className="flex-1">{renderPage()}</main>
      <Footer />
      {route !== 'help-centre' && <PollBotPanel />}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <PortalShell />
    </AppProvider>
  );
}
