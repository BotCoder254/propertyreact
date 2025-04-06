import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiHome } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser } = useAuth();

  useEffect(() => {
    fetchTenants();
  }, [currentUser]);

  async function fetchTenants() {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'leases'),
        where('landlordId', '==', currentUser.uid),
        where('status', '==', 'active')
      );

      const leaseSnapshot = await getDocs(q);
      const tenantIds = leaseSnapshot.docs.map(doc => doc.data().tenantId);

      const tenantsData = await Promise.all(
        tenantIds.map(async (tenantId) => {
          const tenantDoc = await getDocs(query(
            collection(db, 'users'),
            where('uid', '==', tenantId)
          ));
          const propertyDoc = await getDocs(query(
            collection(db, 'properties'),
            where('tenantId', '==', tenantId)
          ));
          
          return {
            ...tenantDoc.data(),
            property: propertyDoc.docs[0]?.data() || null
          };
        })
      );

      setTenants(tenantsData);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Tenants</h1>

      {tenants.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6 text-center"
        >
          <p className="text-gray-500">No tenants found</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant, index) => (
            <motion.div
              key={tenant.uid || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-sm p-6"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative w-16 h-16 rounded-full overflow-hidden">
                  <img
                    src={tenant.photoURL || '/default-avatar.png'}
                    alt={tenant.displayName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {tenant.displayName || 'Unnamed Tenant'}
                  </h3>
                  <div className="flex items-center text-gray-600">
                    <FiMail className="w-4 h-4 mr-1" />
                    <span className="text-sm">{tenant.email}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {tenant.phoneNumber && (
                  <div className="flex items-center">
                    <FiPhone className="w-4 h-4 mr-2" />
                    <span>{tenant.phoneNumber}</span>
                  </div>
                )}
                {tenant.property && (
                  <div className="flex items-center">
                    <FiHome className="w-4 h-4 mr-2" />
                    <span>{tenant.property.name}</span>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full px-4 py-2 bg-primary bg-opacity-10 text-primary rounded-md hover:bg-opacity-20 transition-colors"
                >
                  View Details
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 