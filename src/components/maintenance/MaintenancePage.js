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
      // First get the tenant's approved leases
      const leasesQuery = query(
        collection(db, 'leases'),
        where('tenantId', '==', currentUser.uid),
        where('status', 'in', ['signed', 'active']) // Include both signed and active leases
      );
      const leaseSnapshot = await getDocs(leasesQuery);
      
      if (leaseSnapshot.empty) {
        // If no direct leases, check for property-based leases
        const propertyQuery = query(
          collection(db, 'properties'),
          where('tenantId', '==', currentUser.uid)
        );
        const propertySnapshot = await getDocs(propertyQuery);
        
        if (propertySnapshot.empty) {
          setProperties([]);
          setError('No properties found. Please check your lease status.');
          return;
        }

        // Map properties from direct property assignments
        const propertyData = propertySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setProperties(propertyData);
        if (propertyData.length > 0) {
          setSelectedProperty(propertyData[0]);
          setError(''); // Clear any existing errors
        }
        return;
      }

      // Get all properties from active/signed leases
      const propertyPromises = leaseSnapshot.docs.map(async (leaseDoc) => {
        const leaseData = leaseDoc.data();
        if (!leaseData.propertyId) return null;

        try {
          const propertyRef = doc(db, 'properties', leaseData.propertyId);
          const propertyDoc = await getDoc(propertyRef);
          
          if (propertyDoc.exists()) {
            return {
              id: propertyDoc.id,
              ...propertyDoc.data(),
              leaseId: leaseDoc.id // Store the lease ID for reference
            };
          }
        } catch (error) {
          console.error('Error fetching property:', error);
        }
        return null;
      });

      const propertyData = (await Promise.all(propertyPromises)).filter(Boolean);
      
      if (propertyData.length > 0) {
        setProperties(propertyData);
        if (!selectedProperty) {
          setSelectedProperty(propertyData[0]);
        }
        setError(''); // Clear any existing errors
      } else {
        setProperties([]);
        setError('No properties found. Please contact your landlord.');
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      setError('Failed to fetch properties. Please try again.');
    }
  }

  const handlePropertySelect = (propertyId) => {
    if (!propertyId) {
      setSelectedProperty(null);
      return;
    }
    const property = properties.find(p => p.id === propertyId);
    if (property) {
      setSelectedProperty(property);
      setError(''); // Clear any existing errors
    }
  };

  async function fetchRequests() {
    try {
      setLoading(true);
      setError('');

      let requestsQuery;
      if (userRole === 'tenant') {
        // For tenants, get requests based on their properties
        if (properties.length === 0) {
          await fetchProperties(); // Ensure properties are loaded
        }
        
        if (properties.length > 0) {
          const propertyIds = properties.map(p => p.id);
          requestsQuery = query(
            collection(db, 'maintenance'),
            where('propertyId', 'in', propertyIds)
          );
        } else {
          // Fallback to tenant ID if no properties found
          requestsQuery = query(
            collection(db, 'maintenance'),
            where('tenantId', '==', currentUser.uid)
          );
        }
      } else {
        // For landlords, get all requests for their properties
        requestsQuery = query(
          collection(db, 'maintenance'),
          where('landlordId', '==', currentUser.uid)
        );
      }

      const snapshot = await getDocs(requestsQuery);
      const requestsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = { id: doc.id, ...doc.data() };
          
          // Fetch related property data if not already included
          if (data.propertyId && !data.property) {
            try {
              const propertyRef = doc(db, 'properties', data.propertyId);
              const propertyDoc = await getDoc(propertyRef);
              if (propertyDoc.exists()) {
                data.property = { id: propertyDoc.id, ...propertyDoc.data() };
              }
            } catch (propertyError) {
              console.error('Error fetching property for request:', propertyError);
            }
          }
          
          return data;
        })
      );

      // Sort requests by creation date (newest first)
      const sortedRequests = requestsData.sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );

      setRequests(sortedRequests);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      setError('Failed to fetch maintenance requests. Please try again.');
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
        {userRole === 'tenant' && !showForm && (
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
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Property
                </label>
                <select
                  value={selectedProperty?.id || ''}
                  onChange={(e) => handlePropertySelect(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                >
                  <option value="">Select a property</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.name || property.address}
                    </option>
                  ))}
                </select>
              </div>
              {selectedProperty && (
                <MaintenanceRequestForm
                  property={selectedProperty}
                  onSubmit={handleRequestSubmit}
                  onCancel={() => setShowForm(false)}
                />
              )}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <div className="flex flex-col items-center space-y-4">
                <div className="p-3 rounded-lg bg-yellow-100">
                  <FiHome className="w-12 h-12 text-yellow-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Properties Available</h3>
                  <p className="text-gray-500">Please check your lease status or contact your landlord for assistance.</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowForm(false)}
                  className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Go Back
                </motion.button>
              </div>
            </motion.div>
          )}
        </>
      ) : (
        <>
          {requests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-sm p-6 text-center"
            >
              <div className="flex flex-col items-center space-y-4">
                <FiTool className="w-12 h-12 text-gray-400" />
                <p className="text-gray-500">
                  {userRole === 'tenant' 
                    ? 'No maintenance requests found.'
                    : 'No maintenance requests found.'}
                </p>
              </div>
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