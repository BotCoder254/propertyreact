import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiTool, FiHome, FiCalendar, FiMessageSquare, FiPlusCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function MaintenancePage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, userRole } = useAuth();

  useEffect(() => {
    fetchRequests();
  }, [currentUser, userRole]);

  async function fetchRequests() {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'maintenance'),
        where(userRole === 'landlord' ? 'landlordId' : 'tenantId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      const requestsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRequests(requestsData.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      ));
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      open: {
        className: 'bg-yellow-100 text-yellow-800',
        text: 'Open'
      },
      inProgress: {
        className: 'bg-blue-100 text-blue-800',
        text: 'In Progress'
      },
      completed: {
        className: 'bg-green-100 text-green-800',
        text: 'Completed'
      }
    };

    const badge = badges[status];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
        {badge.text}
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
          Maintenance Requests
        </h1>
        {userRole === 'tenant' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FiPlusCircle className="w-5 h-5 mr-2" />
            New Request
          </motion.button>
        )}
      </div>

      {requests.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6 text-center"
        >
          <p className="text-gray-500">No maintenance requests found</p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {requests.map((request) => (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-primary bg-opacity-10 text-primary">
                    <FiTool className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.title}
                    </h3>
                    <p className="text-sm text-gray-500">{request.category}</p>
                  </div>
                </div>
                {getStatusBadge(request.status)}
              </div>

              <p className="text-gray-600 mb-4">{request.description}</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <FiHome className="w-4 h-4 mr-2" />
                  <span>{request.propertyName}</span>
                </div>
                <div className="flex items-center">
                  <FiCalendar className="w-4 h-4 mr-2" />
                  <span>{new Date(request.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center">
                  <FiMessageSquare className="w-4 h-4 mr-2" />
                  <span>{request.comments?.length || 0} Comments</span>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 bg-primary bg-opacity-10 text-primary rounded-md hover:bg-opacity-20 transition-colors"
                >
                  View Details
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 