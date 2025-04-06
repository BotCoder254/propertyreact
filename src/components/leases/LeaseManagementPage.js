import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFileText, FiUpload, FiCheck, FiX, FiDownload, FiPlusCircle, FiInfo } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import CreateLeaseModal from './CreateLeaseModal';

export default function LeaseManagementPage() {
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedLease, setSelectedLease] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const { currentUser, userRole } = useAuth();

  useEffect(() => {
    fetchLeases();
    if (userRole === 'landlord') {
      fetchProperties();
      fetchPendingApplications();
    }
  }, [currentUser, userRole]);

  async function fetchProperties() {
    try {
      const propertiesQuery = query(
        collection(db, 'properties'),
        where('landlordId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(propertiesQuery);
      const propertiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProperties(propertiesData);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setError('Failed to fetch properties');
    }
  }

  async function fetchPendingApplications() {
    try {
      const applicationsQuery = query(
        collection(db, 'applications'),
        where('landlordId', '==', currentUser.uid),
        where('status', '==', 'approved')
      );
      const snapshot = await getDocs(applicationsQuery);
      const applications = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const applicationData = { id: doc.id, ...doc.data() };
          if (applicationData.propertyId) {
            const propertyDoc = await getDoc(doc(db, 'properties', applicationData.propertyId));
            if (propertyDoc.exists()) {
              applicationData.property = { id: propertyDoc.id, ...propertyDoc.data() };
            }
          }
          return applicationData;
        })
      );
      if (applications.length > 0) {
        setSelectedApplication(applications[0]);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError('Failed to fetch applications');
    }
  }

  async function fetchLeases() {
    try {
      setLoading(true);
      setError('');

      let leasesQuery;
      if (userRole === 'tenant') {
        // For tenants, check both direct leases and property-based leases
        const propertyQuery = query(
          collection(db, 'properties'),
          where('tenantId', '==', currentUser.uid)
        );
        const propertySnapshot = await getDocs(propertyQuery);
        const propertyIds = propertySnapshot.docs.map(doc => doc.id);

        if (propertyIds.length > 0) {
          // If tenant is associated with properties, fetch those leases
          leasesQuery = query(
            collection(db, 'leases'),
            where('propertyId', 'in', propertyIds)
          );
        } else {
          // Otherwise, check for direct tenant assignments
          leasesQuery = query(
            collection(db, 'leases'),
            where('tenantId', '==', currentUser.uid)
          );
        }
      } else {
        // For landlords, fetch their leases as before
        leasesQuery = query(
          collection(db, 'leases'),
          where('landlordId', '==', currentUser.uid)
        );
      }

      const leasesSnapshot = await getDocs(leasesQuery);
      const leasesData = await Promise.all(
        leasesSnapshot.docs.map(async (doc) => {
          const leaseData = { id: doc.id, ...doc.data() };

          try {
            // Fetch related property data
            if (leaseData.propertyId) {
              const propertyDoc = await getDoc(doc(db, 'properties', leaseData.propertyId));
              if (propertyDoc.exists()) {
                leaseData.property = { id: propertyDoc.id, ...propertyDoc.data() };
              }
            }

            // Fetch related application data
            if (leaseData.applicationId) {
              const applicationDoc = await getDoc(doc(db, 'applications', leaseData.applicationId));
              if (applicationDoc.exists()) {
                leaseData.application = { id: applicationDoc.id, ...applicationDoc.data() };
              }
            }

            // Fetch tenant data
            if (leaseData.tenantId) {
              const tenantDoc = await getDoc(doc(db, 'users', leaseData.tenantId));
              if (tenantDoc.exists()) {
                leaseData.tenant = { id: tenantDoc.id, ...tenantDoc.data() };
              }
            }

            // Initialize signatures if they don't exist
            if (!leaseData.signatures) {
              leaseData.signatures = { tenant: false, landlord: false };
            }

            return leaseData;
          } catch (error) {
            console.error('Error fetching related documents:', error);
            return leaseData;
          }
        })
      );

      // Sort leases by creation date
      const sortedLeases = leasesData.sort((a, b) => 
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );

      setLeases(sortedLeases);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching leases:', error);
      setError('Failed to fetch leases. Please try again.');
      setLoading(false);
    }
  }

  const createLease = async () => {
    if (!selectedProperty) {
      setError('Please select a property first');
      return;
    }

    try {
      setError('');
      const leaseData = {
        propertyId: selectedProperty.id,
        tenantId: selectedProperty.tenantId || '',
        landlordId: currentUser.uid,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        startDate: null,
        endDate: null,
        monthlyRent: selectedProperty.price || 0,
        securityDeposit: selectedProperty.securityDeposit || 0,
        documentUrl: null,
        terms: [],
        signatures: {
          tenant: false,
          landlord: false
        }
      };

      const docRef = await addDoc(collection(db, 'leases'), leaseData);
      const newLease = { 
        id: docRef.id, 
        ...leaseData,
        property: selectedProperty 
      };
      setLeases(prev => [newLease, ...prev]);
      setSuccessMessage('Lease created successfully');
      setSelectedProperty(null);
    } catch (error) {
      console.error('Error creating lease:', error);
      setError('Error creating lease. Please try again.');
    }
  };

  const handleFileUpload = async (e, leaseId) => {
    try {
      setError('');
      const file = e.target.files[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }

      const storageRef = ref(storage, `leases/${leaseId}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'leases', leaseId), {
        documentUrl: downloadUrl,
        status: 'pending_signature',
        updatedAt: new Date().toISOString()
      });

      setLeases(prev =>
        prev.map(lease =>
          lease.id === leaseId
            ? {
                ...lease,
                documentUrl: downloadUrl,
                status: 'pending_signature',
                updatedAt: new Date().toISOString()
              }
            : lease
        )
      );

      setSuccessMessage('Lease document uploaded successfully');
    } catch (error) {
      console.error('Error uploading lease document:', error);
      setError('Failed to upload lease document');
    }
  };

  const handleLeaseAction = async (leaseId, action) => {
    try {
      setError('');
      const leaseRef = doc(db, 'leases', leaseId);
      const leaseDoc = await getDoc(leaseRef);
      
      if (!leaseDoc.exists()) {
        setError('Lease not found');
        return;
      }

      const leaseData = leaseDoc.data();
      const updates = {
        updatedAt: new Date().toISOString()
      };

      if (action === 'sign') {
        // Initialize signatures object if it doesn't exist
        const currentSignatures = leaseData.signatures || { tenant: false, landlord: false };
        updates.signatures = {
          ...currentSignatures,
          [userRole]: true
        };

        // Check if both parties have signed
        const otherPartyHasSigned = userRole === 'tenant' 
          ? currentSignatures.landlord 
          : currentSignatures.tenant;

        updates.status = otherPartyHasSigned ? 'signed' : 'pending_signature';
      } else if (action === 'reject') {
        updates.status = 'rejected';
      }

      await updateDoc(leaseRef, updates);
      
      // Update local state
      setLeases(prev =>
        prev.map(lease =>
          lease.id === leaseId
            ? { 
                ...lease, 
                ...updates,
                signatures: updates.signatures || lease.signatures 
              }
            : lease
        )
      );

      setSuccessMessage(`Lease ${action === 'sign' ? 'signed' : 'rejected'} successfully`);
    } catch (error) {
      console.error('Error updating lease:', error);
      setError(`Failed to ${action} lease`);
    }
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
          {userRole === 'landlord' ? 'Lease Management' : 'My Leases'}
        </h1>
        {userRole === 'landlord' && properties.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FiPlusCircle className="w-5 h-5 mr-2" />
            Create New Lease
          </motion.button>
        )}
      </div>

      {/* Property Selection for Landlords */}
      {userRole === 'landlord' && properties.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Property
          </label>
          <select
            value={selectedProperty?.id || ''}
            onChange={(e) => {
              const property = properties.find(p => p.id === e.target.value);
              setSelectedProperty(property);
            }}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
          >
            <option value="">All Properties</option>
            {properties.map(property => (
              <option key={property.id} value={property.id}>
                {property.name || property.address}
              </option>
            ))}
          </select>
        </div>
      )}

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

        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4"
          >
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {leases.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6 text-center"
        >
          <div className="flex flex-col items-center space-y-4">
            <FiFileText className="w-12 h-12 text-gray-400" />
            <p className="text-gray-500">
              {userRole === 'tenant' 
                ? 'No lease agreements found. Your landlord will create a lease once your application is approved.'
                : 'No leases found. Click "Create New Lease" to get started.'}
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6">
        {leases.map((lease) => (
          <motion.div
            key={lease.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="p-3 rounded-lg bg-primary bg-opacity-10 text-primary">
                    <FiFileText className="w-6 h-6" />
                  </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                      {lease.property?.name || 'Lease Agreement'}
                </h3>
                <p className="text-sm text-gray-500">
                  {lease.property?.address}
                </p>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(lease.createdAt).toLocaleDateString()}
                    </p>
              </div>
            </div>
                <div className="flex items-center space-x-2">
                  {lease.monthlyRent > 0 && (
                    <span className="text-sm text-gray-600 mr-4">
                      ${lease.monthlyRent}/month
                    </span>
                  )}
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    lease.status === 'signed' ? 'bg-green-100 text-green-800' :
                    lease.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}
                  </span>
              </div>
            </div>

              <div className="mt-4 flex justify-end space-x-4">
            {userRole === 'landlord' && lease.status === 'draft' && (
                  <div className="flex items-center">
                <input
                  type="file"
                      id={`lease-file-${lease.id}`}
                      accept="application/pdf"
                  onChange={(e) => handleFileUpload(e, lease.id)}
                      className="hidden"
                />
                    <motion.label
                      htmlFor={`lease-file-${lease.id}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="cursor-pointer flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                    >
                      <FiUpload className="w-4 h-4 mr-2" />
                      Upload Document
                    </motion.label>
              </div>
            )}

            {lease.documentUrl && (
                  <motion.a
                    href={lease.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                    className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                    <FiDownload className="w-4 h-4 mr-2" />
                  View Document
                  </motion.a>
                )}

                {lease.status === 'pending_signature' && (
                  <div className="mt-4 flex justify-end space-x-4">
                    {(!lease.signatures || !lease.signatures[userRole]) && (
                      <>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleLeaseAction(lease.id, 'reject')}
                          className="flex items-center px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50"
                        >
                          <FiX className="w-4 h-4 mr-2" />
                          Reject
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleLeaseAction(lease.id, 'sign')}
                          className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                        >
                          <FiCheck className="w-4 h-4 mr-2" />
                          Sign Lease
                        </motion.button>
                      </>
                    )}

                    {lease.signatures && lease.signatures[userRole] && (
                      <div className="flex items-center text-gray-600">
                        <FiInfo className="w-4 h-4 mr-2" />
                        Waiting for other party to sign
                      </div>
                    )}
                  </div>
                )}
                </div>
              </motion.div>
          ))}
          </div>
        )}

      {/* Create Lease Modal */}
      {showCreateModal && (
        <CreateLeaseModal
          property={selectedProperty}
          application={selectedApplication}
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            fetchLeases();
          }}
        />
      )}
    </div>
  );
} 
