import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiCalendar, FiHome, FiCheck, FiClock } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, userRole } = useAuth();

  useEffect(() => {
    fetchPayments();
  }, [currentUser, userRole]);

  async function fetchPayments() {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'payments'),
        where(userRole === 'landlord' ? 'landlordId' : 'tenantId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      const paymentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPayments(paymentsData.sort((a, b) => 
        new Date(b.dueDate) - new Date(a.dueDate)
      ));
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      pending: {
        icon: <FiClock className="w-4 h-4" />,
        text: 'Pending',
        className: 'bg-yellow-100 text-yellow-800'
      },
      completed: {
        icon: <FiCheck className="w-4 h-4" />,
        text: 'Paid',
        className: 'bg-green-100 text-green-800'
      }
    };

    const badge = badges[status];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.icon}
        <span className="ml-1">{badge.text}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {userRole === 'landlord' ? 'Payment History' : 'My Payments'}
        </h1>
        {userRole === 'tenant' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Make Payment
          </motion.button>
        )}
      </div>

      {payments.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6 text-center"
        >
          <p className="text-gray-500">No payments found</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {payments.map((payment) => (
            <motion.div
              key={payment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-primary bg-opacity-10 text-primary">
                    <FiDollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      ${payment.amount.toLocaleString()}
                    </h3>
                    <p className="text-sm text-gray-500">Monthly Rent</p>
                  </div>
                </div>
                {getStatusBadge(payment.status)}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center text-gray-600">
                  <FiCalendar className="w-4 h-4 mr-2" />
                  <span>Due: {new Date(payment.dueDate).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FiHome className="w-4 h-4 mr-2" />
                  <span>{payment.propertyName}</span>
                </div>
              </div>

              {payment.status === 'pending' && userRole === 'tenant' && (
                <div className="mt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                  >
                    Pay Now
                  </motion.button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 