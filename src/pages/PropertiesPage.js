import { useState } from 'react';
import { motion } from 'framer-motion';
import PropertyList from '../components/properties/PropertyList';
import { useAuth } from '../context/AuthContext';

export default function PropertiesPage() {
  const { userRole } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);

  const handleEdit = (property) => {
    setSelectedProperty(property);
    setIsEditModalOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {userRole === 'landlord' ? 'My Properties' : 'Available Properties'}
        </h1>
      </div>

      <PropertyList onEdit={handleEdit} />

      {/* Add Property Edit Modal here when needed */}
    </motion.div>
  );
} 