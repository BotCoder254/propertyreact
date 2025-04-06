import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiHome, FiDollarSign, FiTool, FiMessageSquare } from 'react-icons/fi';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

export default function TenantDashboard() {
  const [stats, setStats] = useState({
    activeLeases: 0,
    pendingPayments: 0,
    maintenanceRequests: 0,
    unreadMessages: 0,
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch active leases
        const leasesQuery = query(
          collection(db, 'leases'),
          where('tenantId', '==', currentUser.uid),
          where('status', '==', 'active')
        );
        const leasesSnap = await getDocs(leasesQuery);

        // Fetch pending payments
        const paymentsQuery = query(
          collection(db, 'payments'),
          where('tenantId', '==', currentUser.uid),
          where('status', '==', 'pending')
        );
        const paymentsSnap = await getDocs(paymentsQuery);

        // Fetch maintenance requests
        const maintenanceQuery = query(
          collection(db, 'maintenance'),
          where('tenantId', '==', currentUser.uid),
          where('status', '==', 'open')
        );
        const maintenanceSnap = await getDocs(maintenanceQuery);

        // Fetch unread messages
        const messagesQuery = query(
          collection(db, 'messages'),
          where('recipientId', '==', currentUser.uid),
          where('read', '==', false)
        );
        const messagesSnap = await getDocs(messagesQuery);

        setStats({
          activeLeases: leasesSnap.size,
          pendingPayments: paymentsSnap.size,
          maintenanceRequests: maintenanceSnap.size,
          unreadMessages: messagesSnap.size,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }

    fetchStats();
  }, [currentUser]);

  const statCards = [
    {
      title: 'Active Leases',
      value: stats.activeLeases,
      icon: <FiHome className="w-6 h-6" />,
      color: 'bg-primary',
    },
    {
      title: 'Pending Payments',
      value: stats.pendingPayments,
      icon: <FiDollarSign className="w-6 h-6" />,
      color: 'bg-highlight',
    },
    {
      title: 'Maintenance Requests',
      value: stats.maintenanceRequests,
      icon: <FiTool className="w-6 h-6" />,
      color: 'bg-secondary',
    },
    {
      title: 'Unread Messages',
      value: stats.unreadMessages,
      icon: <FiMessageSquare className="w-6 h-6" />,
      color: 'bg-accent',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color} text-white`}>
                {stat.icon}
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stat.value}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-4 bg-primary bg-opacity-10 rounded-lg text-primary hover:bg-opacity-20 transition-colors"
          >
            View Lease Details
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-4 bg-highlight bg-opacity-10 rounded-lg text-highlight hover:bg-opacity-20 transition-colors"
          >
            Make a Payment
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="p-4 bg-secondary bg-opacity-10 rounded-lg text-secondary hover:bg-opacity-20 transition-colors"
          >
            Submit Maintenance Request
          </motion.button>
        </div>
      </div>
    </div>
  );
} 