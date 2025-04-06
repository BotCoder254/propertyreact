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
import { Line, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

export default function LandlordDashboard() {
  const [stats, setStats] = useState({
    totalProperties: 0,
    occupiedUnits: 0,
    totalRevenue: 0,
    pendingMaintenance: 0,
  });
  const [revenueData, setRevenueData] = useState([
    { month: 'Jan', amount: 0 },
    { month: 'Feb', amount: 0 },
    { month: 'Mar', amount: 0 },
    { month: 'Apr', amount: 0 },
    { month: 'May', amount: 0 },
    { month: 'Jun', amount: 0 },
  ]);
  const [occupancyData, setOccupancyData] = useState([
    { name: 'Occupied', value: 0 },
    { name: 'Vacant', value: 0 },
  ]);
  const [maintenanceData, setMaintenanceData] = useState([
    { name: 'Pending', value: 0 },
    { name: 'In Progress', value: 0 },
    { name: 'Completed', value: 0 },
  ]);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
      try {
        // Fetch properties and calculate occupancy
        const propertiesQuery = query(
          collection(db, 'properties'),
          where('landlordId', '==', currentUser.uid)
        );
        const propertiesSnap = await getDocs(propertiesQuery);
        const totalProperties = propertiesSnap.size;

        const leasesQuery = query(
          collection(db, 'leases'),
          where('landlordId', '==', currentUser.uid),
          where('status', '==', 'active')
        );
        const leasesSnap = await getDocs(leasesQuery);
        const occupiedUnits = leasesSnap.size;

        setOccupancyData([
          { name: 'Occupied', value: occupiedUnits },
          { name: 'Vacant', value: totalProperties - occupiedUnits }
        ]);

        // Fetch maintenance requests
        const maintenanceQuery = query(
          collection(db, 'maintenance'),
          where('landlordId', '==', currentUser.uid)
        );
        const maintenanceSnap = await getDocs(maintenanceQuery);
        const maintenanceRequests = maintenanceSnap.docs.map(doc => doc.data());
        
        const maintenanceStats = {
          Pending: 0,
          'In Progress': 0,
          Completed: 0
        };

        maintenanceRequests.forEach(request => {
          if (request.status === 'pending') maintenanceStats.Pending++;
          else if (request.status === 'in_progress') maintenanceStats['In Progress']++;
          else if (request.status === 'completed') maintenanceStats.Completed++;
        });

        setMaintenanceData([
          { name: 'Pending', value: maintenanceStats.Pending },
          { name: 'In Progress', value: maintenanceStats['In Progress'] },
          { name: 'Completed', value: maintenanceStats.Completed }
        ]);

        // Fetch payments for revenue data
        const paymentsQuery = query(
          collection(db, 'payments'),
          where('landlordId', '==', currentUser.uid),
          where('status', '==', 'completed')
        );
        const paymentsSnap = await getDocs(paymentsQuery);
        const payments = paymentsSnap.docs.map(doc => ({
          ...doc.data(),
          date: new Date(doc.data().date)
        }));

        // Calculate last 6 months revenue
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          return {
            month: monthNames[date.getMonth()],
            amount: 0,
            timestamp: date.getTime()
          };
        }).reverse();

        payments.forEach(payment => {
          const monthIndex = last6Months.findIndex(
            month => payment.date.getMonth() === new Date(month.timestamp).getMonth()
          );
          if (monthIndex !== -1) {
            last6Months[monthIndex].amount += payment.amount;
          }
        });

        setRevenueData(last6Months);

        // Update stats
        setStats({
          totalProperties,
          occupiedUnits,
          totalRevenue: payments.reduce((sum, payment) => sum + payment.amount, 0),
          pendingMaintenance: maintenanceStats.Pending,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
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