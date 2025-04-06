import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiDollarSign, FiCalendar, FiFileText, FiUpload, FiHome } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase/config';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function CreateLeaseModal({ property, application, isOpen, onClose }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(property || null);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    monthlyRent: property?.price || '',
    securityDeposit: '',
    terms: ''
  });

  useEffect(() => {
    if (isOpen) {
      fetchProperties();
    }
  }, [isOpen, currentUser]);

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
      if (!selectedProperty && propertiesData.length > 0) {
        setSelectedProperty(propertiesData[0]);
        setFormData(prev => ({
          ...prev,
          monthlyRent: propertiesData[0].price || ''
        }));
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      setError('Failed to fetch properties');
    }
  }

  const handlePropertyChange = (propertyId) => {
    const property = properties.find(p => p.id === propertyId);
    setSelectedProperty(property);
    setFormData(prev => ({
      ...prev,
      monthlyRent: property?.price || ''
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }
    setSelectedFile(file);
    setError('');
  };

  const validateForm = () => {
    if (!selectedProperty) {
      setError('Please select a property');
      return false;
    }

    if (!formData.startDate || !formData.endDate) {
      setError('Please select both start and end dates');
      return false;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('End date must be after start date');
      return false;
    }

    if (!formData.monthlyRent || formData.monthlyRent <= 0) {
      setError('Please enter a valid monthly rent amount');
      return false;
    }

    if (!formData.securityDeposit || formData.securityDeposit <= 0) {
      setError('Please enter a valid security deposit amount');
      return false;
    }

    if (!formData.terms.trim()) {
      setError('Please enter lease terms and conditions');
      return false;
    }

    if (!selectedFile) {
      setError('Please upload a lease document');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setLoading(true);
      setError('');

      // Upload lease document to Firebase Storage
      const fileName = `${Date.now()}_${selectedFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `leases/${fileName}`);
      
      // Upload the file with metadata
      const metadata = {
        contentType: 'application/pdf',
        customMetadata: {
          propertyId: selectedProperty.id,
          createdBy: currentUser.uid,
        }
      };
      
      await uploadBytes(storageRef, selectedFile, metadata);
      const documentUrl = await getDownloadURL(storageRef);

      // Create lease document in Firestore
      const leaseData = {
        propertyId: selectedProperty.id,
        tenantId: selectedProperty.tenantId || application?.tenantId || null,
        landlordId: currentUser.uid,
        applicationId: application?.id || null,
        status: selectedProperty.tenantId || application?.tenantId ? 'pending_signature' : 'draft',
        documentUrl,
        startDate: formData.startDate,
        endDate: formData.endDate,
        monthlyRent: parseFloat(formData.monthlyRent),
        securityDeposit: parseFloat(formData.securityDeposit),
        terms: formData.terms.trim(),
        signatures: {
          tenant: false,
          landlord: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add the lease document to Firestore
      const docRef = await addDoc(collection(db, 'leases'), leaseData);
      
      // Clear form and close modal
      setFormData({
        startDate: '',
        endDate: '',
        monthlyRent: '',
        securityDeposit: '',
        terms: ''
      });
      setSelectedFile(null);
      onClose();
    } catch (error) {
      console.error('Error creating lease:', error);
      if (error.code === 'storage/unauthorized') {
        setError('Unauthorized to upload files. Please check your permissions.');
      } else if (error.code === 'storage/quota-exceeded') {
        setError('Storage quota exceeded. Please contact support.');
      } else {
        setError('Failed to create lease. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-white rounded-lg max-w-lg w-full mx-auto p-6 shadow-xl z-[101]"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Create New Lease
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-md bg-red-100 text-red-700"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Property Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Property
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiHome className="text-gray-400" />
                </div>
                <select
                  value={selectedProperty?.id || ''}
                  onChange={(e) => handlePropertyChange(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select a property</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>
                      {property.name || property.address}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiCalendar className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiCalendar className="text-gray-400" />
                  </div>
                  <input
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Rent
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiDollarSign className="text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="monthlyRent"
                    value={formData.monthlyRent}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Security Deposit
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiDollarSign className="text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="securityDeposit"
                    value={formData.securityDeposit}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Terms and Conditions
              </label>
              <div className="relative">
                <div className="absolute top-3 left-3 text-gray-400">
                  <FiFileText />
                </div>
                <textarea
                  name="terms"
                  value={formData.terms}
                  onChange={handleInputChange}
                  rows={6}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                  placeholder="Enter lease terms and conditions..."
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Lease Document (PDF)
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <FiUpload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark">
                      <span>Upload a file</span>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={handleFileChange}
                        className="sr-only"
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PDF up to 10MB</p>
                </div>
              </div>
              {selectedFile && (
                <p className="mt-2 text-sm text-gray-500">
                  Selected file: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-transparent rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                {loading ? 'Creating...' : 'Create Lease'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
} 
