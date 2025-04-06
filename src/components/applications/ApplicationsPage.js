import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiHome, FiDollarSign, FiBriefcase, FiCheck, FiX, FiFileText } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import CreateLeaseModal from '../leases/CreateLeaseModal';

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showLeaseModal, setShowLeaseModal] = useState(false);
  const { currentUser, userRole } = useAuth();

  useEffect(() => {
    fetchApplications();
  }, [currentUser, userRole]);

  async function fetchApplications() {
    try {
      setLoading(true);
      setError('');
      
      const applicationsQuery = query(
        collection(db, 'applications'),
        where(userRole === 'landlord' ? 'landlordId' : 'tenantId', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(applicationsQuery);
      const applicationsData = await Promise.all(
        querySnapshot.docs.map(async (docSnapshot) => {
          const applicationData = { id: docSnapshot.id, ...docSnapshot.data() };
          
          // Fetch property details
          const propertyDoc = await getDoc(doc(db, 'properties', applicationData.propertyId));
          if (propertyDoc.exists()) {
            applicationData.property = propertyDoc.data();
          }

          // Check if lease exists
          const leaseQuery = query(
            collection(db, 'leases'),
            where('applicationId', '==', docSnapshot.id)
          );
          const leaseSnapshot = await getDocs(leaseQuery);
          applicationData.hasLease = !leaseSnapshot.empty;

          return applicationData;
        })
      );

      setApplications(applicationsData.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      ));
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  }

  const handleStatusUpdate = async (applicationId, status) => {
    try {
      setLoading(true);
      setError('');

      await updateDoc(doc(db, 'applications', applicationId), {
        status,
        updatedAt: new Date().toISOString()
      });

      setSuccessMessage(`Application ${status === 'approved' ? 'approved' : 'rejected'} successfully`);
      fetchApplications();
    } catch (error) {
      console.error('Error updating application status:', error);
      setError('Failed to update application status');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLease = (application) => {
    setSelectedApplication(application);
    setShowLeaseModal(true);
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' }
    };

    const badge = badges[status] || badges.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
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
          {userRole === 'landlord' ? 'Rental Applications' : 'My Applications'}
        </h1>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-red-100 text-red-700 rounded-md"
        >
          {error}
        </motion.div>
      )}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-green-100 text-green-700 rounded-md"
        >
          {successMessage}
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {applications.map((application) => (
          <motion.div
            key={application.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {application.property?.name || 'Unnamed Property'}
                </h3>
                <p className="text-sm text-gray-500">
                  {application.property?.address}
                </p>
              </div>
              {getStatusBadge(application.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center text-gray-600">
                <FiBriefcase className="w-5 h-5 mr-2" />
                <div>
                  <p className="text-sm font-medium">Employment</p>
                  <p className="text-sm">{application.employmentStatus}</p>
                </div>
              </div>

              <div className="flex items-center text-gray-600">
                <FiDollarSign className="w-5 h-5 mr-2" />
                <div>
                  <p className="text-sm font-medium">Monthly Income</p>
                  <p className="text-sm">${application.monthlyIncome?.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center text-gray-600">
                <FiHome className="w-5 h-5 mr-2" />
                <div>
                  <p className="text-sm font-medium">Previous Address</p>
                  <p className="text-sm">{application.previousAddress}</p>
                </div>
              </div>
            </div>

            {application.references && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">References</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {application.references.map((reference, index) => (
                    <div key={index} className="text-sm text-gray-600">
                      <p className="font-medium">{reference.name}</p>
                      <p>{reference.relationship}</p>
                      <p>{reference.phone}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {userRole === 'landlord' && application.status === 'pending' && (
              <div className="flex justify-end space-x-4 mt-4 pt-4 border-t border-gray-200">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStatusUpdate(application.id, 'rejected')}
                  className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                >
                  Reject
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleStatusUpdate(application.id, 'approved')}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Approve
                </motion.button>
              </div>
            )}

            {userRole === 'landlord' && application.status === 'approved' && !application.hasLease && (
              <div className="flex justify-end mt-4 pt-4 border-t border-gray-200">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCreateLease(application)}
                  className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  <FiFileText className="w-4 h-4 mr-2" />
                  Create Lease
                </motion.button>
              </div>
            )}
          </motion.div>
        ))}

        {applications.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6 text-center"
          >
            <p className="text-gray-500">No applications found</p>
          </motion.div>
        )}
      </div>

      <CreateLeaseModal
        property={selectedApplication?.property}
        application={selectedApplication}
        isOpen={showLeaseModal}
        onClose={() => {
          setShowLeaseModal(false);
          setSelectedApplication(null);
        }}
      />
    </div>
  );
} 