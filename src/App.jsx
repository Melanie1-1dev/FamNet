import { Toaster } from "@/Components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import ScrollToTop from './Components/ScrollToTop';
import { FamilyProvider } from '@/lib/FamilyContext';
import Layout from '@/Components/Layout';
import ProtectedRoute from '@/Components/ProtectedRoute';
import Dashboard from '@/lib/pages/Dashboard';
import Family from '@/lib/pages/Family';
import Requirements from '@/lib/pages/Requirements';
import Tasks from '@/lib/pages/Tasks';
import CalendarPage from '@/lib/pages/Calendar';
import FinanceOverview from '@/lib/pages/finance/FinanceOverview';
import Income from '@/lib/pages/finance/Income';
import Expenses from '@/lib/pages/finance/Expenses';
import Savings from '@/lib/pages/finance/Savings';
import Budgets from '@/lib/pages/finance/Budgets';
import Bills from '@/lib/pages/finance/Bills';
import Goals from '@/lib/pages/Goals';
import Shopping from '@/lib/pages/Shopping';
import Documents from '@/lib/pages/Documents';
import Requests from '@/lib/pages/Requests';
import Notifications from '@/lib/pages/Notifications';
import Analytics from '@/lib/pages/Analytics';
import SettingsPage from '@/lib/pages/Settings';
import SearchPage from '@/lib/pages/Search';
import Login from '@/lib/pages/Login';
import Register from '@/lib/pages/Register';
import ForgotPassword from '@/lib/pages/ForgotPassword';
// Add page imports here

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        {/* FamilyProvider only mounts for signed-in users */}
        <Route element={<FamilyProvider><Layout /></FamilyProvider>}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/family" element={<Family />} />
          <Route path="/requirements" element={<Requirements />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/finance" element={<FinanceOverview />} />
          <Route path="/finance/income" element={<Income />} />
          <Route path="/finance/expenses" element={<Expenses />} />
          <Route path="/finance/savings" element={<Savings />} />
          <Route path="/finance/budgets" element={<Budgets />} />
          <Route path="/finance/bills" element={<Bills />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/shopping" element={<Shopping />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/search" element={<SearchPage />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App