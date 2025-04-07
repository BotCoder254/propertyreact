import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ForgotPassword from './components/auth/ForgotPassword';
import DashboardLayout from './components/layout/DashboardLayout';
import TenantDashboard from './components/dashboard/TenantDashboard';
import LandlordDashboard from './components/dashboard/LandlordDashboard';
import ProfilePage from './components/profile/ProfilePage';
import PropertiesPage from './components/properties/PropertiesPage';
import PropertyForm from './components/properties/PropertyForm';
import ApplicationsPage from './components/applications/ApplicationsPage';
import TenantsPage from './components/tenants/TenantsPage';
import SettingsPage from './components/settings/SettingsPage';
import PaymentsPage from './components/payments/PaymentsPage';
import MaintenancePage from './components/maintenance/MaintenancePage';
import LeaseManagementPage from './components/leases/LeaseManagementPage';
import PropertyView from './components/properties/PropertyView';

// Protected Route Component
function ProtectedRoute({ children }) {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return children;
}

// Role-based Dashboard Component
function DashboardComponent() {
  const { userRole } = useAuth();
  return userRole === 'tenant' ? <TenantDashboard /> : <LandlordDashboard />;
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardComponent />} />
            <Route path="dashboard" element={<DashboardComponent />} />
            <Route path="profile" element={<ProfilePage />} />
            
            {/* Property Routes */}
            <Route path="properties" element={<PropertiesPage />} />
            <Route path="properties/:propertyId" element={<PropertyView />} />
            <Route path="add-property" element={<PropertyForm />} />
            <Route path="my-properties" element={<PropertiesPage />} />
            
            {/* Lease Routes */}
            <Route path="leases" element={<LeaseManagementPage />} />
            
            {/* Applications Routes */}
            <Route path="applications" element={<ApplicationsPage />} />
           
            {/* Tenant Management Routes */}
            <Route path="tenants" element={<TenantsPage />} />
            
            {/* Payment Routes */}
            <Route path="payments" element={<PaymentsPage />} />
            
            {/* Maintenance Routes */}
            <Route path="maintenance" element={<MaintenancePage />} />
            
            {/* Settings Routes */}
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
