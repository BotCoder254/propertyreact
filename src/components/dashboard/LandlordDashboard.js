import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiHome,
  FiUsers,
  FiDollarSign,
  FiTool,
  FiPlusCircle,
} from 'react-icons/fi';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function LandlordDashboard() {
  const [stats, setStats] = useState({
    totalProperties: 0,
    occupiedUnits: 0,
    totalRevenue: 0,
    pendingMaintenance: 0,
  });
  const { currentUser } = useAuth();

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch properties
        const propertiesQuery = query(
          collection(db, 'properties'),
          where('landlordId', '==', currentUser.uid)
        );
        const propertiesSnap = await getDocs(propertiesQuery);
        const totalProperties = propertiesSnap.size;

        // Fetch occupied units
        const leasesQuery = query(
          collection(db, 'leases'),
          where('landlordId', '==', currentUser.uid),
          where('status', '==', 'active')
        );
        const leasesSnap = await getDocs(leasesQuery);
        const occupiedUnits = leasesSnap.size;

        // Fetch maintenance requests
        const maintenanceQuery = query(
          collection(db, 'maintenance'),
          where('landlordId', '==', currentUser.uid),
          where('status', '==', 'pending')
        );
        const maintenanceSnap = await getDocs(maintenanceQuery);

        // Calculate total revenue
        const paymentsQuery = query(
          collection(db, 'payments'),
          where('landlordId', '==', currentUser.uid),
          where('status', '==', 'completed')
        );
        const paymentsSnap = await getDocs(paymentsQuery);
        const totalRevenue = paymentsSnap.docs.reduce(
          (sum, doc) => sum + doc.data().amount,
          0
        );

        setStats({
          totalProperties,
          occupiedUnits,
          totalRevenue,
          pendingMaintenance: maintenanceSnap.size,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    }

    fetchStats();
  }, [currentUser]);

  const statCards = [
    {
      title: 'Total Properties',
      value: stats.totalProperties,
      icon: <FiHome className="w-6 h-6" />,
      color: 'bg-primary',
    },
    {
      title: 'Occupied Units',
      value: stats.occupiedUnits,
      icon: <FiUsers className="w-6 h-6" />,
      color: 'bg-highlight',
    },
    {
      title: 'Monthly Revenue',
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: <FiDollarSign className="w-6 h-6" />,
      color: 'bg-secondary',
    },
    {
      title: 'Pending Maintenance',
      value: stats.pendingMaintenance,
      icon: <FiTool className="w-6 h-6" />,
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
          <Link to="/add-property">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-4 bg-primary bg-opacity-10 rounded-lg text-primary hover:bg-opacity-20 transition-colors flex items-center justify-center"
            >
              <FiPlusCircle className="mr-2" />
              Add New Property
            </motion.button>
          </Link>
          <Link to="/maintenance">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-4 bg-highlight bg-opacity-10 rounded-lg text-highlight hover:bg-opacity-20 transition-colors flex items-center justify-center"
            >
              <FiTool className="mr-2" />
              View Maintenance Requests
            </motion.button>
          </Link>
          <Link to="/tenants">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-4 bg-secondary bg-opacity-10 rounded-lg text-secondary hover:bg-opacity-20 transition-colors flex items-center justify-center"
            >
              <FiUsers className="mr-2" />
              Manage Tenants
            </motion.button>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Recent Activity
        </h2>
        <div className="space-y-4">
          {/* Add recent activity items here */}
          <p className="text-gray-600">No recent activity to display.</p>
        </div>
      </div>
    </div>
  );
} 