import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiMapPin, FiDollarSign, FiHome, FiDroplet, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import PropertySearch from './PropertySearch';

export default function PropertyList({ onEdit }) {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser, userRole } = useAuth();

  useEffect(() => {
    fetchProperties();
  }, [currentUser, userRole]);

  async function fetchProperties() {
    try {
      setLoading(true);
      let q;
      
      if (userRole === 'landlord') {
        q = query(
          collection(db, 'properties'),
          where('landlordId', '==', currentUser.uid)
        );
      } else {
        q = query(collection(db, 'properties'));
      }

      const querySnapshot = await getDocs(q);
      const propertiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const sortedProperties = propertiesData.sort((a, b) => a.price - b.price);
      
      setProperties(sortedProperties);
      setFilteredProperties(sortedProperties);
    } catch (error) {
      setError('Failed to fetch properties');
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (searchTerm) => {
    if (!searchTerm) {
      setFilteredProperties(properties);
      return;
    }

    const searchTermLower = searchTerm.toLowerCase();
    const filtered = properties.filter(property => 
      property.name.toLowerCase().includes(searchTermLower) ||
      property.address.toLowerCase().includes(searchTermLower)
    );
    setFilteredProperties(filtered);
  };

  const handleFilter = (filters) => {
    let filtered = [...properties];

    if (filters.city) {
      filtered = filtered.filter(property => 
        property.city?.toLowerCase() === filters.city.toLowerCase()
      );
    }

    if (filters.minPrice) {
      filtered = filtered.filter(property => 
        (property.price || 0) >= Number(filters.minPrice)
      );
    }

    if (filters.maxPrice) {
      filtered = filtered.filter(property => 
        (property.price || 0) <= Number(filters.maxPrice)
      );
    }

    if (filters.propertyType) {
      filtered = filtered.filter(property => 
        property.type?.toLowerCase() === filters.propertyType.toLowerCase()
      );
    }

    setFilteredProperties(filtered);
  };

  async function handleDelete(propertyId) {
    if (!window.confirm('Are you sure you want to delete this property?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'properties', propertyId));
      setProperties(prev => prev.filter(p => p.id !== propertyId));
      setFilteredProperties(prev => prev.filter(p => p.id !== propertyId));
    } catch (error) {
      console.error('Error deleting property:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PropertySearch onSearch={handleSearch} onFilter={handleFilter} />
      
      <AnimatePresence>
        {filteredProperties.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center h-64"
          >
            <img
              src="/empty-state.svg"
              alt="No properties found"
              className="w-32 h-32 mb-4"
            />
            <h3 className="text-lg font-medium text-gray-900">No properties found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
              <motion.div
                key={property.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                {/* Property Image */}
                <div className="relative h-48">
                  <img
                    src={property.images?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3'}
                    alt={property.name}
                    className="w-full h-full object-cover"
                  />
                  {userRole === 'landlord' && (
                    <div className="absolute top-2 right-2 space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => onEdit(property)}
                        className="p-2 bg-white rounded-full shadow-md text-primary hover:text-primary-dark"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(property.id)}
                        className="p-2 bg-white rounded-full shadow-md text-red-500 hover:text-red-600"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </motion.button>
                    </div>
                  )}
                </div>

                {/* Property Details */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {property.name}
                  </h3>
                  
                  <div className="flex items-center text-gray-600 mb-2">
                    <FiMapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm">{property.address}</span>
                  </div>

                  <div className="flex items-center text-gray-900 mb-4">
                    <FiDollarSign className="w-4 h-4 mr-1" />
                    <span className="text-lg font-semibold">
                      ${property.price ? property.price.toLocaleString() : '0'}/month
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-gray-600">
                    <div className="flex items-center">
                      <FiHome className="w-4 h-4 mr-1" />
                      <span className="text-sm">{property.bedrooms} Beds</span>
                    </div>
                    <div className="flex items-center">
                      <FiDroplet className="w-4 h-4 mr-1" />
                      <span className="text-sm">{property.bathrooms} Baths</span>
                    </div>
                    <div className="text-sm">
                      {property.area} sq ft
                    </div>
                  </div>

                  {userRole === 'tenant' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full mt-4 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Contact Landlord
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
} 
