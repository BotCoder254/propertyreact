import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTool, FiHome, FiCalendar, FiMessageSquare, FiPlusCircle, FiCheck, FiClock, FiAlertTriangle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import MaintenanceRequestForm from './MaintenanceRequestForm';

const MaintenancePage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [properties, setProperties] = useState([]);
  const { currentUser, userRole } = useAuth();

  useEffect(() => {
    fetchRequests();
    if (userRole === 'tenant') {
      fetchProperties();
    }
  }, [currentUser, userRole]);

  async function fetchProperties() {
    try {
      const q = query(
        collection(db, 'properties'),
        where('tenantId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const propertyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProperties(propertyData);
      
      if (propertyData.length > 0 && !selectedProperty) {
        setSelectedProperty(propertyData[0]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      setError('Failed to fetch properties');
    }
  }

  const handlePropertySelect = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    setSelectedProperty(property);
  };

  async function fetchRequests() {
    try {
      setLoading(true);
      setError('');
      const q = query(
        collection(db, 'maintenance'),
        where(userRole === 'landlord' ? 'landlordId' : 'tenantId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(q);
      const requestsData = await Promise.all(querySnapshot.docs.map(async doc => {
        const request = { id: doc.id, ...doc.data() };
        if (request.propertyId) {
          const propertyDoc = await getDoc(doc(db, 'properties', request.propertyId));
          if (propertyDoc.exists()) {
            request.property = propertyDoc.data();
          }
        }
        return request;
      }));

      setRequests(requestsData.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      ));
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      setError('Failed to fetch maintenance requests');
    } finally {
      setLoading(false);
    }
  }

  const handleStatusUpdate = async (requestId, newStatus) => {
    try {
      setError('');
      await updateDoc(doc(db, 'maintenance', requestId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      setRequests(prev =>
        prev.map(request =>
          request.id === requestId
            ? { ...request, status: newStatus, updatedAt: new Date().toISOString() }
            : request
        )
      );
    } catch (error) {
      console.error('Error updating request status:', error);
      setError('Failed to update request status');
    }
  };

  const handleRequestSubmit = async (requestData) => {
    setRequests(prev => [requestData, ...prev]);
    setShowForm(false);
    setError('');
  };

  const getStatusBadge = (status) => {
    const badges = {
      open: {
        icon: <FiAlertTriangle className="w-4 h-4" />,
        text: 'Open',
        className: 'bg-yellow-100 text-yellow-800'
      },
      'in_progress': {
        icon: <FiClock className="w-4 h-4" />,
        text: 'In Progress',
        className: 'bg-blue-100 text-blue-800'
      },
      completed: {
        icon: <FiCheck className="w-4 h-4" />,
        text: 'Completed',
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
          Maintenance Requests
        </h1>
        {userRole === 'tenant' && !showForm && properties.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FiPlusCircle className="w-5 h-5 mr-2" />
            New Request
          </motion.button>
        )}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {showForm ? (
        <>
          {properties.length > 0 ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Property
              </label>
              <select
                value={selectedProperty?.id || ''}
                onChange={(e) => handlePropertySelect(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              >
                {properties.map(property => (
                  <option key={property.id} value={property.id}>
                    {property.name || property.address}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4"
            >
              No properties found. Please contact your landlord.
            </motion.div>
          )}
          <MaintenanceRequestForm
            property={selectedProperty}
            onSubmit={handleRequestSubmit}
            onCancel={() => setShowForm(false)}
          />
        </>
      ) : (
        <>
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

                  {request.images && request.images.length > 0 && (
                    <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                      {request.images.map((image, index) => (
                        <a
                          key={index}
                          href={image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={image}
                            alt={`Request ${index + 1}`}
                            className="h-24 w-full object-cover rounded-lg hover:opacity-75 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  )}

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
                      <span>Priority: {request.priority}</span>
                    </div>
                  </div>

                  {userRole === 'landlord' && request.status !== 'completed' && (
                    <div className="mt-4 flex justify-end space-x-4">
                      {request.status === 'open' && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleStatusUpdate(request.id, 'in_progress')}
                          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                        >
                          Start Work
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleStatusUpdate(request.id, 'completed')}
                        className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                      >
                        Mark Complete
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MaintenancePage; 