import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiHome, FiDollarSign, FiMapPin, FiUser, FiDroplet, FiSquare, FiTrash2, FiPlus, FiX, FiCheck } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db, storage } from '../../firebase/config';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export default function PropertyForm({ property, onSubmit, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState(property?.images || []);
  const [newImages, setNewImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [amenities, setAmenities] = useState(property?.amenities || []);
  const fileInputRef = useRef();
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    name: property?.name || '',
    address: property?.address || '',
    city: property?.city || '',
    state: property?.state || '',
    zipCode: property?.zipCode || '',
    price: property?.price || '',
    description: property?.description || '',
    bedrooms: property?.bedrooms || '',
    bathrooms: property?.bathrooms || '',
    squareFeet: property?.squareFeet || '',
    propertyType: property?.propertyType || 'apartment',
    yearBuilt: property?.yearBuilt || '',
    parking: property?.parking || '',
    petPolicy: property?.petPolicy || 'no-pets',
    features: property?.features || []
  });
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    const newPreviews = [];
    const newImages = [];

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload only image files');
        return;
      }
      const preview = URL.createObjectURL(file);
      newPreviews.push(preview);
      newImages.push(file);
    }

    setPreviews(prev => [...prev, ...newPreviews]);
    setNewImages(prev => [...prev, ...newImages]);
  };

  const removeImage = (index) => {
    URL.revokeObjectURL(previews[index]);
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAmenityToggle = (amenity) => {
    setAmenities(prev => 
      prev.includes(amenity) 
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate required fields
      if (!formData.name || !formData.address || !formData.price) {
        throw new Error('Please fill in all required fields');
      }

      const propertyData = {
        ...formData,
        amenities,
        images: [...images],
        landlordId: currentUser.uid,
        status: 'available',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Upload new images
      if (newImages.length > 0) {
        const uploadedUrls = await Promise.all(
          newImages.map(async (file) => {
            const storageRef = ref(storage, `properties/${currentUser.uid}/${Date.now()}-${file.name}`);
            await uploadBytes(storageRef, file);
            return getDownloadURL(storageRef);
          })
        );
        propertyData.images = [...images, ...uploadedUrls];
      }

      if (property?.id) {
        // Update existing property
        await updateDoc(doc(db, 'properties', property.id), propertyData);
      } else {
        // Create new property
        await addDoc(collection(db, 'properties'), propertyData);
      }

      setSuccess('Property saved successfully!');
      
      // Reset form if it's a new property
      if (!property?.id) {
        setFormData({
          name: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          price: '',
          bedrooms: '',
          bathrooms: '',
          squareFeet: '',
          description: '',
          propertyType: 'apartment',
          petPolicy: 'no-pets',
          amenities: [],
        });
        setImages([]);
        setNewImages([]);
      }

      if (typeof onSubmit === 'function') {
        onSubmit(propertyData);
      }
    } catch (err) {
      console.error('Error saving property:', err);
      setError('Failed to save property. Please try again.');
    } finally {
      setLoading(false);
      // Clear success message after 3 seconds
      if (success) {
        setTimeout(() => setSuccess(''), 3000);
      }
    }
  };

  const amenityOptions = [
    'Air Conditioning', 'Heating', 'Washer/Dryer', 'Dishwasher', 
    'Fitness Center', 'Pool', 'Elevator', 'Security System',
    'Balcony', 'Storage', 'Parking', 'Pet Friendly'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm p-6"
    >
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">
        {property ? 'Edit Property' : 'Add New Property'}
      </h2>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"
        >
          {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4"
        >
          {success}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Property Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiHome className="text-gray-400" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monthly Rent
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiDollarSign className="text-gray-400" />
              </div>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiMapPin className="text-gray-400" />
            </div>
            <input
              type="text"
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City
            </label>
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State
            </label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ZIP Code
            </label>
            <input
              type="text"
              name="zipCode"
              value={formData.zipCode}
              onChange={handleInputChange}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bedrooms
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiUser className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bathrooms
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiDroplet className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Square Feet
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSquare className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="number"
                name="squareFeet"
                value={formData.squareFeet}
                onChange={handleInputChange}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                required
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Property Type
          </label>
          <select
            name="propertyType"
            value={formData.propertyType}
            onChange={handleInputChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
          >
            <option value="apartment">Apartment</option>
            <option value="house">House</option>
            <option value="condo">Condo</option>
            <option value="townhouse">Townhouse</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pet Policy
          </label>
          <select
            name="petPolicy"
            value={formData.petPolicy}
            onChange={handleInputChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
          >
            <option value="no-pets">No Pets Allowed</option>
            <option value="cats-only">Cats Only</option>
            <option value="dogs-only">Dogs Only</option>
            <option value="both-allowed">Both Cats and Dogs Allowed</option>
            <option value="case-by-case">Case by Case Basis</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amenities
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {amenityOptions.map((amenity) => (
              <label
                key={amenity}
                className="inline-flex items-center"
              >
                <input
                  type="checkbox"
                  checked={amenities.includes(amenity)}
                  onChange={() => handleAmenityToggle(amenity)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">{amenity}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Property Images
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <FiPlus className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-primary hover:text-primary-dark focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary">
                  <span>Upload images</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageChange}
                    className="sr-only"
                    ref={fileInputRef}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG up to 10MB each</p>
            </div>
          </div>

          {previews.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="h-24 w-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
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
            {loading ? 'Saving...' : property ? 'Update Property' : 'Add Property'}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
} 