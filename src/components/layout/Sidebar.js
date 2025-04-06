import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiHome,
  FiUser,
  FiKey,
  FiDollarSign,
  FiTool,
  FiMessageSquare,
  FiSettings,
  FiLogOut,
  FiPlusCircle,
  FiList,
  FiUsers,
  FiChevronLeft,
  FiChevronRight,
  FiGrid,
  FiFileText
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { userRole, logout } = useAuth();

  const tenantLinks = [
    { name: 'Dashboard', icon: <FiHome />, path: '/dashboard' },
    { name: 'My Profile', icon: <FiUser />, path: '/profile' },
    { name: 'Available Properties', icon: <FiGrid />, path: '/properties' },
    { name: 'My Applications', icon: <FiFileText />, path: '/applications' },
    { name: 'My Leases', icon: <FiKey />, path: '/leases' },
    { name: 'Payments', icon: <FiDollarSign />, path: '/payments' },
    { name: 'Maintenance', icon: <FiTool />, path: '/maintenance' },
  ];

  const landlordLinks = [
    { name: 'Dashboard', icon: <FiHome />, path: '/dashboard' },
    { name: 'My Profile', icon: <FiUser />, path: '/profile' },
    { name: 'Add Property', icon: <FiPlusCircle />, path: '/add-property' },
    { name: 'My Properties', icon: <FiList />, path: '/my-properties' },
    { name: 'Lease Management', icon: <FiKey />, path: '/leases' },
    { name: 'Applications', icon: <FiFileText />, path: '/applications' },
    { name: 'Tenants', icon: <FiUsers />, path: '/tenants' },
    { name: 'Payments', icon: <FiDollarSign />, path: '/payments' },
    { name: 'Maintenance', icon: <FiTool />, path: '/maintenance' },
  ];

  const links = userRole === 'tenant' ? tenantLinks : landlordLinks;

  const sidebarVariants = {
    expanded: { width: '240px' },
    collapsed: { width: '80px' }
  };

  return (
    <motion.div
      initial="expanded"
      animate={isCollapsed ? 'collapsed' : 'expanded'}
      variants={sidebarVariants}
      className="min-h-screen bg-white border-r border-gray-200 flex flex-col"
    >
      {/* Logo */}
      <div className="p-4 flex items-center justify-between border-b border-gray-200">
        <AnimatePresence>
          {!isCollapsed && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xl font-bold text-primary"
            >
              PropertyPro
            </motion.h1>
          )}
        </AnimatePresence>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"
        >
          {isCollapsed ? <FiChevronRight /> : <FiChevronLeft />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {links.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
              location.pathname === link.path
                ? 'bg-primary text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="text-xl">{link.icon}</span>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="ml-3"
                >
                  {link.name}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200">
        <Link
          to="/settings"
          className={`flex items-center px-3 py-2 rounded-lg transition-colors mb-2 ${
            location.pathname === '/settings'
              ? 'bg-primary text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <FiSettings className="text-xl" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="ml-3"
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
        >
          <FiLogOut className="text-xl" />
          <AnimatePresence>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="ml-3"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
} 