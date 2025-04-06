import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiDollarSign, FiBriefcase, FiUsers } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';

export default function ApplicationModal({ property, isOpen, onClose }) {
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    employmentStatus: '',
    employer: '',
    monthlyIncome: '',
    employmentLength: '',
    previousAddress: '',
    references: [
      { name: '', relationship: '', phone: '' },
      { name: '', relationship: '', phone: '' }
    ],
    additionalInfo: ''
  });

  const handleInputChange = (e, index = null) => {
    const { name, value } = e.target;
    
    if (index !== null) {
      // Handle references array
      const newReferences = [...formData.references];
      newReferences[index] = { ...newReferences[index], [name]: value };
      setFormData(prev => ({ ...prev, references: newReferences }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const applicationData = {
        ...formData,
        tenantId: currentUser.uid,
        landlordId: property.landlordId,
        propertyId: property.id,
        propertyName: property.name,
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'applications'), applicationData);
      onClose();
    } catch (error) {
      console.error('Error submitting application:', error);
    } finally {
      setLoading(false);
    }
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1 }
  };

  const steps = [
    {
      title: 'Employment Information',
      icon: <FiBriefcase className="w-6 h-6" />,
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Employment Status</label>
            <select
              name="employmentStatus"
              value={formData.employmentStatus}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="">Select Status</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="self-employed">Self-employed</option>
              <option value="unemployed">Unemployed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Employer</label>
            <input
              type="text"
              name="employer"
              value={formData.employer}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Monthly Income</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiDollarSign className="text-gray-400" />
              </div>
              <input
                type="number"
                name="monthlyIncome"
                value={formData.monthlyIncome}
                onChange={handleInputChange}
                className="pl-8 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Length of Employment</label>
            <input
              type="text"
              name="employmentLength"
              value={formData.employmentLength}
              onChange={handleInputChange}
              placeholder="e.g., 2 years"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>
        </div>
      )
    },
    {
      title: 'References',
      icon: <FiUsers className="w-6 h-6" />,
      content: (
        <div className="space-y-6">
          {formData.references.map((reference, index) => (
            <div key={index} className="space-y-4">
              <h4 className="font-medium">Reference {index + 1}</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={reference.name}
                  onChange={(e) => handleInputChange(e, index)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Relationship</label>
                <input
                  type="text"
                  name="relationship"
                  value={reference.relationship}
                  onChange={(e) => handleInputChange(e, index)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={reference.phone}
                  onChange={(e) => handleInputChange(e, index)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
                />
              </div>
            </div>
          ))}
        </div>
      )
    }
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            className="inline-block w-full max-w-2xl transform overflow-hidden rounded-lg bg-white p-6 text-left align-bottom shadow-xl transition-all sm:my-8 sm:align-middle"
          >
            <div className="absolute right-0 top-0 pr-4 pt-4">
              <button
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Rental Application - {property.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Please fill out all required information
              </p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex justify-center">
                {steps.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center ${
                      i < steps.length - 1 ? 'w-full' : ''
                    }`}
                  >
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full border-2 ${
                        step > i
                          ? 'border-primary bg-primary text-white'
                          : step === i + 1
                          ? 'border-primary text-primary'
                          : 'border-gray-300 text-gray-300'
                      }`}
                    >
                      {s.icon}
                    </div>
                    {i < steps.length - 1 && (
                      <div
                        className={`h-0.5 w-full ${
                          step > i + 1 ? 'bg-primary' : 'bg-gray-300'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              {steps[step - 1].content}

              <div className="mt-8 flex justify-between">
                {step > 1 && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setStep(step - 1)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                  >
                    Previous
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type={step === steps.length ? 'submit' : 'button'}
                  onClick={() => step < steps.length && setStep(step + 1)}
                  disabled={loading}
                  className="ml-auto px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  {step === steps.length
                    ? loading
                      ? 'Submitting...'
                      : 'Submit Application'
                    : 'Next'}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
} 