import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiFileText, FiUpload, FiCheck, FiX, FiDownload, FiPlusCircle, FiInfo } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase/config';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function LeaseManagementPage() {
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [properties, setProperties] = useState([]);
  const { currentUser, userRole } = useAuth();

  useEffect(() => {
    fetchLeases();
    if (userRole === 'landlord') {
      fetchProperties();
    }
  }, [currentUser, userRole]);

  async function fetchProperties() {
    try {
      const q = query(
        collection(db, 'properties'),
        where('landlordId', '==', currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const propertyData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProperties(propertyData);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setError('Failed to fetch properties');
    }
  }

  async function fetchLeases() {
    try {
      setLoading(true);
      setError('');
      let q;
      
      if (userRole === 'tenant') {
        // For tenants, fetch leases where they are the tenant
        q = query(
          collection(db, 'leases'),
          where('tenantId', '==', currentUser.uid)
        );
      } else {
        // For landlords, fetch leases where they are the landlord
        q = query(
          collection(db, 'leases'),
          where('landlordId', '==', currentUser.uid)
        );
      }

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty && userRole === 'tenant') {
        // If no direct leases found for tenant, check properties they're associated with
        const propertyQuery = query(
          collection(db, 'properties'),
          where('tenantId', '==', currentUser.uid)
        );
        const propertySnapshot = await getDocs(propertyQuery);
        
        if (!propertySnapshot.empty) {
          const propertyIds = propertySnapshot.docs.map(doc => doc.id);
          const leaseQuery = query(
            collection(db, 'leases'),
            where('propertyId', 'in', propertyIds)
          );
          const leaseSnapshot = await getDocs(leaseQuery);
          const leasesData = await Promise.all(leaseSnapshot.docs.map(async doc => {
            const lease = { id: doc.id, ...doc.data() };
            if (lease.propertyId) {
              const propertyDoc = await getDoc(doc(db, 'properties', lease.propertyId));
              if (propertyDoc.exists()) {
                lease.property = propertyDoc.data();
              }
            }
            return lease;
          }));
          setLeases(leasesData.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          ));
          return;
        }
      }

      const leasesData = await Promise.all(querySnapshot.docs.map(async doc => {
        const lease = { id: doc.id, ...doc.data() };
        if (lease.propertyId) {
          const propertyDoc = await getDoc(doc(db, 'properties', lease.propertyId));
          if (propertyDoc.exists()) {
            lease.property = propertyDoc.data();
          }
        }
        return lease;
      }));

      setLeases(leasesData.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      ));
    } catch (error) {
      console.error('Error fetching leases:', error);
      setError('Failed to fetch leases. Please try again.');
    } finally {
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
      const updates = {
        updatedAt: new Date().toISOString()
      };

      if (action === 'sign') {
        updates[`signatures.${userRole}`] = true;
        // Check if both parties have signed
        const leaseDoc = await getDoc(leaseRef);
        const leaseData = leaseDoc.data();
        const otherPartyHasSigned = userRole === 'tenant' 
          ? leaseData.signatures.landlord 
          : leaseData.signatures.tenant;
        
        updates.status = otherPartyHasSigned ? 'signed' : 'pending_signature';
      } else if (action === 'reject') {
        updates.status = 'rejected';
      }

      await updateDoc(leaseRef, updates);
      setLeases(prev =>
        prev.map(lease =>
          lease.id === leaseId
            ? { ...lease, ...updates }
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
          {userRole === 'tenant' ? 'My Leases' : 'Lease Management'}
        </h1>
        {userRole === 'landlord' && (
          <div className="flex items-center space-x-4">
            <select
              value={selectedProperty?.id || ''}
              onChange={(e) => {
                const property = properties.find(p => p.id === e.target.value);
                setSelectedProperty(property || null);
              }}
              className="block w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md"
            >
              <option value="">Select a property</option>
              {properties.map(property => (
                <option key={property.id} value={property.id}>
                  {property.name || property.address}
                </option>
              ))}
            </select>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={createLease}
              className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <FiPlusCircle className="w-5 h-5 mr-2" />
              Create New Lease
            </motion.button>
          </div>
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
          <p className="text-gray-500">
            {userRole === 'tenant' 
              ? 'You have no active leases at this time.'
              : 'No leases found'}
          </p>
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

                {lease.status === 'pending_signature' && !lease.signatures[userRole] && (
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

                {lease.status === 'pending_signature' && lease.signatures[userRole] && (
                  <div className="flex items-center text-gray-600">
                    <FiInfo className="w-4 h-4 mr-2" />
                    Waiting for other party to sign
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 
