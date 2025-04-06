import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiPlusCircle } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import PropertyForm from './PropertyForm';
import PropertyList from './PropertyList';

export default function PropertiesPage() {
  const [showForm, setShowForm] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const { userRole } = useAuth();

  const handleFormSubmit = () => {
    setShowForm(false);
    setSelectedProperty(null);
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedProperty(null);
  };

  const handleEdit = (property) => {
    setSelectedProperty(property);
    setShowForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          {userRole === 'landlord' ? 'My Properties' : 'Available Properties'}
        </h1>
        {userRole === 'landlord' && !showForm && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FiPlusCircle className="w-5 h-5 mr-2" />
            Add New Property
          </motion.button>
        )}
      </div>

      {showForm ? (
        <PropertyForm
          property={selectedProperty}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />
      ) : (
        <PropertyList onEdit={handleEdit} />
      )}
    </div>
  );
} 