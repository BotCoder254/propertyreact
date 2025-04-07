import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { FiHome, FiDollarSign, FiMapPin, FiUser, FiDroplet, FiSquare, FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import ApplicationModal from '../applications/ApplicationModal';

export default function PropertyView() {
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const { currentUser, userRole } = useAuth();

  useEffect(() => {
    const fetchPropertyAndStatus = async () => {
      try {
        // Fetch property details
        const propertyDoc = await getDoc(doc(db, 'properties', propertyId));
        if (!propertyDoc.exists()) {
          setError('Property not found');
          return;
        }

        const propertyData = { id: propertyDoc.id, ...propertyDoc.data() };
        setProperty(propertyData);

        // Check if there are any approved applications
        const applicationsQuery = query(
          collection(db, 'applications'),
          where('propertyId', '==', propertyId),
          where('status', '==', 'approved')
        );
        const applicationsSnapshot = await getDocs(applicationsQuery);
        
        // Also check if there are any active leases
        const leasesQuery = query(
          collection(db, 'leases'),
          where('propertyId', '==', propertyId),
          where('status', 'in', ['active', 'signed'])
        );
        const leasesSnapshot = await getDocs(leasesQuery);

        // Property is not available if there are approved applications or active leases
        setIsAvailable(!applicationsSnapshot.size && !leasesSnapshot.size);
      } catch (err) {
        console.error('Error fetching property:', err);
        setError('Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyAndStatus();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          {error || 'Property not found'}
        </h2>
        <button
          onClick={() => navigate('/properties')}
          className="text-primary hover:text-primary-dark"
        >
          Back to Properties
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm overflow-hidden"
      >
        {/* Image Gallery */}
        <div className="relative h-96">
          {property.images && property.images.length > 0 ? (
            <img
              src={property.images[0]}
              alt={property.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <FiHome className="w-12 h-12 text-gray-400" />
            </div>
          )}
        </div>

        {/* Property Details */}
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {property.name}
              </h1>
              <div className="flex items-center text-gray-600">
                <FiMapPin className="w-5 h-5 mr-2" />
                <p>{property.address}, {property.city}, {property.state} {property.zipCode}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                ${property.price.toLocaleString()}/mo
              </div>
              <div className="mt-2">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {isAvailable ? 'Available' : 'Not Available'}
                </span>
              </div>
              {userRole === 'tenant' && (
                <motion.button
                  whileHover={{ scale: isAvailable ? 1.02 : 1 }}
                  whileTap={{ scale: isAvailable ? 0.98 : 1 }}
                  onClick={() => isAvailable && setShowApplicationModal(true)}
                  className={`mt-4 px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary ${
                    isAvailable 
                      ? 'bg-primary text-white hover:bg-primary-dark cursor-pointer'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={!isAvailable}
                >
                  {isAvailable ? 'Apply Now' : 'Not Available'}
                </motion.button>
              )}
            </div>
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="flex items-center">
              <FiUser className="w-6 h-6 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Bedrooms</p>
                <p className="text-lg font-semibold">{property.bedrooms}</p>
              </div>
            </div>
            <div className="flex items-center">
              <FiDroplet className="w-6 h-6 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Bathrooms</p>
                <p className="text-lg font-semibold">{property.bathrooms}</p>
              </div>
            </div>
            <div className="flex items-center">
              <FiSquare className="w-6 h-6 text-gray-400 mr-2" />
              <div>
                <p className="text-sm text-gray-500">Square Feet</p>
                <p className="text-lg font-semibold">{property.squareFeet}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-600 whitespace-pre-line">{property.description}</p>
          </div>

          {/* Property Details */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Property Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Property Type</p>
                <p className="text-gray-900 capitalize">{property.propertyType}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pet Policy</p>
                <p className="text-gray-900 capitalize">
                  {property.petPolicy.split('-').join(' ')}
                </p>
              </div>
            </div>
          </div>

          {/* Amenities */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Amenities</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {property.amenities?.map((amenity) => (
                <div key={amenity} className="flex items-center">
                  <FiCheck className="w-5 h-5 text-primary mr-2" />
                  <span className="text-gray-600">{amenity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Image Gallery Grid */}
          {property.images && property.images.length > 1 && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Photo Gallery</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {property.images.map((image, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.05 }}
                    className="relative aspect-w-4 aspect-h-3"
                  >
                    <img
                      src={image}
                      alt={`${property.name} - ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <ApplicationModal
        property={property}
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
      />
    </div>
  );
} 
