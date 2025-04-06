import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiHome, FiDollarSign, FiTool, FiMessageSquare } from 'react-icons/fi';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { Line, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Link } from 'react-router-dom';

export default function TenantDashboard() {
  const [stats, setStats] = useState({
    activeLeases: 0,
    pendingPayments: 0,
    maintenanceRequests: 0,
    unreadMessages: 0,
  });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    // Real-time listeners for stats
    const unsubscribeLeases = onSnapshot(
      query(
        collection(db, 'leases'),
        where('tenantId', '==', currentUser.uid),
        where('status', '==', 'active')
      ),
      (snapshot) => {
        const activeLeases = snapshot.size;
        setStats(prev => ({ ...prev, activeLeases }));
      }
    );

    const unsubscribePayments = onSnapshot(
      query(
        collection(db, 'payments'),
        where('tenantId', '==', currentUser.uid),
        where('status', '==', 'pending')
      ),
      (snapshot) => {
        const pendingPayments = snapshot.size;
        setStats(prev => ({ ...prev, pendingPayments }));
      }
    );

    const unsubscribeMaintenance = onSnapshot(
      query(
        collection(db, 'maintenance'),
        where('tenantId', '==', currentUser.uid),
        where('status', '==', 'open')
      ),
      (snapshot) => {
        const maintenanceRequests = snapshot.size;
        setStats(prev => ({ ...prev, maintenanceRequests }));
      }
    );

    const unsubscribeMessages = onSnapshot(
      query(
        collection(db, 'messages'),
        where('recipientId', '==', currentUser.uid),
        where('read', '==', false)
      ),
      (snapshot) => {
        const unreadMessages = snapshot.size;
        setStats(prev => ({ ...prev, unreadMessages }));
      }
    );

    // Fetch payment history
    const fetchPaymentHistory = async () => {
      try {
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          return date.toISOString().slice(0, 7); // YYYY-MM format
        }).reverse();

        const paymentsByMonth = {};
        last6Months.forEach(month => {
          paymentsByMonth[month] = 0;
        });

        const paymentsQuery = query(
          collection(db, 'payments'),
          where('tenantId', '==', currentUser.uid),
          where('status', '==', 'completed')
        );

        const paymentsSnap = await getDocs(paymentsQuery);
        paymentsSnap.docs.forEach(doc => {
          const payment = doc.data();
          const paymentMonth = payment.date.slice(0, 7);
          if (paymentsByMonth.hasOwnProperty(paymentMonth)) {
            paymentsByMonth[paymentMonth] += payment.amount;
          }
        });

        setPaymentHistory(
          Object.entries(paymentsByMonth).map(([month, amount]) => ({
            month: month,
            amount: amount
          }))
        );
      } catch (error) {
        console.error('Error fetching payment history:', error);
      }
    };

    // Fetch maintenance history
    const fetchMaintenanceHistory = async () => {
      try {
        const maintenanceQuery = query(
          collection(db, 'maintenance'),
          where('tenantId', '==', currentUser.uid)
        );

        const maintenanceSnap = await getDocs(maintenanceQuery);
        const requests = maintenanceSnap.docs.map(doc => doc.data());

        const maintenanceStats = {
          open: requests.filter(req => req.status === 'open').length,
          inProgress: requests.filter(req => req.status === 'in_progress').length,
          completed: requests.filter(req => req.status === 'completed').length
        };

        setMaintenanceHistory([
          { status: 'Open', count: maintenanceStats.open },
          { status: 'In Progress', count: maintenanceStats.inProgress },
          { status: 'Completed', count: maintenanceStats.completed }
        ]);
      } catch (error) {
        console.error('Error fetching maintenance history:', error);
      }
    };

    fetchPaymentHistory();
    fetchMaintenanceHistory();
    setLoading(false);

    return () => {
      unsubscribeLeases();
      unsubscribePayments();
      unsubscribeMaintenance();
      unsubscribeMessages();
    };
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

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <h3 className="text-lg font-medium text-gray-900 mb-4">Payment History</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <Line
                data={paymentHistory}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#4F46E5" />
              </Line>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Maintenance History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <h3 className="text-lg font-medium text-gray-900 mb-4">Maintenance History</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <Bar
                data={maintenanceHistory}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#4F46E5" />
              </Bar>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link to="/lease">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-4 bg-primary bg-opacity-10 rounded-lg text-primary hover:bg-opacity-20 transition-colors flex items-center justify-center"
            >
              <FiHome className="mr-2" />
              View Lease Details
            </motion.button>
          </Link>
          <Link to="/payments">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-4 bg-highlight bg-opacity-10 rounded-lg text-highlight hover:bg-opacity-20 transition-colors flex items-center justify-center"
            >
              <FiDollarSign className="mr-2" />
              Make a Payment
            </motion.button>
          </Link>
          <Link to="/maintenance/new">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-4 bg-secondary bg-opacity-10 rounded-lg text-secondary hover:bg-opacity-20 transition-colors flex items-center justify-center"
            >
              <FiTool className="mr-2" />
              Submit Maintenance Request
            </motion.button>
          </Link>
        </div>
      </div>
    </div>
  );
} 