import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { FiHome, FiDollarSign, FiMapPin, FiUser, FiDroplet, FiEdit2, FiTrash2, FiCheck, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, deleteDoc, doc, getDocs } from 'firebase/firestore';
import PropertySearch from './PropertySearch';

export default function PropertyList({ onEdit }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filteredProperties, setFilteredProperties] = useState([]);
  const { currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) return;

    const fetchPropertiesWithStatus = async (propertiesData) => {
      const updatedProperties = await Promise.all(
        propertiesData.map(async (property) => {
          // Check for approved applications
          const applicationsQuery = query(
            collection(db, 'applications'),
            where('propertyId', '==', property.id),
            where('status', '==', 'approved')
          );
          const applicationsSnapshot = await getDocs(applicationsQuery);

          // Check for active leases
          const leasesQuery = query(
            collection(db, 'leases'),
            where('propertyId', '==', property.id),
            where('status', 'in', ['active', 'signed'])
          );
          const leasesSnapshot = await getDocs(leasesQuery);

          return {
            ...property,
            isAvailable: !applicationsSnapshot.size && !leasesSnapshot.size
          };
        })
      );
      return updatedProperties;
    };

    const propertiesQuery = query(
      collection(db, 'properties'),
      userRole === 'landlord' 
        ? where('landlordId', '==', currentUser.uid)
        : where('status', '==', 'available')
    );

    const unsubscribe = onSnapshot(propertiesQuery, async (snapshot) => {
      try {
        const propertiesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const propertiesWithStatus = await fetchPropertiesWithStatus(propertiesData);
        setProperties(propertiesWithStatus);
        setFilteredProperties(propertiesWithStatus);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setError('Failed to load properties');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser, userRole]);

  const handleSearch = (searchTerm) => {
    if (!searchTerm) {
      setFilteredProperties(properties);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = properties.filter(property => 
      property.name.toLowerCase().includes(searchLower) ||
      property.address.toLowerCase().includes(searchLower) ||
      property.city.toLowerCase().includes(searchLower)
    );
    setFilteredProperties(filtered);
  };

  const handleFilter = (filters) => {
    let filtered = [...properties];

    if (filters.city) {
      filtered = filtered.filter(property => 
        property.city.toLowerCase() === filters.city.toLowerCase()
      );
    }

    if (filters.minPrice) {
      filtered = filtered.filter(property => 
        property.price >= parseFloat(filters.minPrice)
      );
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(property => 
        property.price <= parseFloat(filters.maxPrice)
      );
    }

    if (filters.propertyType) {
      filtered = filtered.filter(property => 
        property.propertyType === filters.propertyType
      );
    }

    if (filters.availability && filters.availability !== 'all') {
      filtered = filtered.filter(property => 
        filters.availability === 'available' ? property.isAvailable : !property.isAvailable
      );
    }

    setFilteredProperties(filtered);
  };

  const handleDelete = async (propertyId) => {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'properties', propertyId));
    } catch (err) {
      console.error('Error deleting property:', err);
      setError('Failed to delete property');
    }
  };

  const handlePropertyClick = (propertyId, e) => {
    if (e.target.closest('button')) {
      return;
    }
    navigate(`/properties/${propertyId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PropertySearch onSearch={handleSearch} onFilter={handleFilter} />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-100 text-red-700 p-4 rounded-lg"
        >
          {error}
        </motion.div>
      )}

      {filteredProperties.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6 text-center"
        >
          <p className="text-gray-500">No properties found</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <motion.div
              key={property.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -5 }}
              className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer"
              onClick={(e) => handlePropertyClick(property.id, e)}
            >
              <div className="relative h-48">
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
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <span className="px-2 py-1 bg-primary text-white text-sm rounded-md">
                    ${property.price.toLocaleString()}/mo
                  </span>
                  <span className={`px-2 py-1 text-sm rounded-md ${
                    property.isAvailable 
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {property.isAvailable ? 'Available' : 'Not Available'}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {property.name}
                </h3>
                <div className="flex items-center text-gray-600 mb-4">
                  <FiMapPin className="w-4 h-4 mr-1" />
                  <span className="text-sm">{property.address}</span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center text-gray-600">
                    <FiUser className="w-4 h-4 mr-1" />
                    <span className="text-sm">{property.bedrooms} Beds</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <FiDroplet className="w-4 h-4 mr-1" />
                    <span className="text-sm">{property.bathrooms} Baths</span>
                  </div>
                  <div className="flex items-center text-gray-600">
                    <span className="text-sm">{property.squareFeet} sqft</span>
                  </div>
                </div>

                {userRole === 'landlord' && (
                  <div className="flex justify-end space-x-2 mt-4 pt-4 border-t border-gray-200">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(property);
                      }}
                      className="p-2 text-primary hover:bg-primary hover:bg-opacity-10 rounded-full"
                    >
                      <FiEdit2 className="w-5 h-5" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(property.id);
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-full"
                    >
                      <FiTrash2 className="w-5 h-5" />
                    </motion.button>
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
