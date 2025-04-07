import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiUser, FiMail, FiPhone, FiHome, FiMessageSquare, FiFileText, FiDollarSign, FiTool } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

export default function TenantsPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { currentUser } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    // Set up real-time listener for leases
    const leasesQuery = query(
      collection(db, 'leases'),
      where('landlordId', '==', currentUser.uid),
      where('status', 'in', ['active', 'signed', 'pending'])
    );

    const unsubscribe = onSnapshot(leasesQuery, async (snapshot) => {
      try {
        const tenantsData = new Map();

        // Process each lease
        for (const leaseDoc of snapshot.docs) {
          const leaseData = { id: leaseDoc.id, ...leaseDoc.data() };
          const tenantId = leaseData.tenantId;

          // Skip if we've already processed this tenant
          if (tenantsData.has(tenantId)) continue;

          try {
            // Fetch tenant details using doc reference
            const tenantDocRef = doc(db, 'users', tenantId);
            const tenantSnap = await getDoc(tenantDocRef);

            if (tenantSnap.exists()) {
              const tenantData = tenantSnap.data();

              // Fetch property details using doc reference
              const propertyDocRef = doc(db, 'properties', leaseData.propertyId);
              const propertySnap = await getDoc(propertyDocRef);
              const propertyData = propertySnap.exists() ? propertySnap.data() : null;

              // Fetch maintenance requests
              const maintenanceQuery = query(
                collection(db, 'maintenance'),
                where('tenantId', '==', tenantId),
                where('status', '==', 'pending')
              );
              const maintenanceSnap = await getDocs(maintenanceQuery);

              // Fetch pending payments
              const paymentsQuery = query(
                collection(db, 'payments'),
                where('tenantId', '==', tenantId),
                where('status', '==', 'pending')
              );
              const paymentsSnap = await getDocs(paymentsQuery);

              tenantsData.set(tenantId, {
                id: tenantId,
                ...tenantData,
                property: {
                  id: leaseData.propertyId,
                  ...propertyData
                },
                leaseId: leaseDoc.id,
                leaseStatus: leaseData.status,
                pendingMaintenance: maintenanceSnap.size,
                pendingPayments: paymentsSnap.size
              });
            }
          } catch (err) {
            console.error(`Error processing tenant ${tenantId}:`, err);
          }
        }

        const sortedTenants = Array.from(tenantsData.values()).sort((a, b) => {
          // Sort by lease status (active first, then signed, then pending)
          const statusOrder = { active: 0, signed: 1, pending: 2 };
          return statusOrder[a.leaseStatus] - statusOrder[b.leaseStatus];
        });

        setTenants(sortedTenants);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tenants:', err);
        setError('Failed to fetch tenants data');
        setLoading(false);
      }
    }, (err) => {
      console.error('Error setting up tenant listener:', err);
      setError('Failed to connect to tenant updates');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

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

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-100 text-red-700 p-4 rounded-lg mb-6"
        >
          {error}
        </motion.div>
      )}

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
              key={tenant.id || index}
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
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tenant.leaseStatus === 'active' ? 'bg-green-100 text-green-800' :
                      tenant.leaseStatus === 'signed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {tenant.leaseStatus.charAt(0).toUpperCase() + tenant.leaseStatus.slice(1)}
                    </span>
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
                    <span>{tenant.property.name || tenant.property.address}</span>
                  </div>
                )}
                {tenant.pendingMaintenance > 0 && (
                  <div className="flex items-center text-yellow-600">
                    <FiTool className="w-4 h-4 mr-2" />
                    <span>{tenant.pendingMaintenance} pending maintenance requests</span>
                  </div>
                )}
                {tenant.pendingPayments > 0 && (
                  <div className="flex items-center text-red-600">
                    <FiDollarSign className="w-4 h-4 mr-2" />
                    <span>{tenant.pendingPayments} pending payments</span>
                  </div>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  to={`/leases/${tenant.leaseId}`}
                  className="flex items-center justify-center px-3 py-2 bg-primary bg-opacity-10 text-primary rounded-md hover:bg-opacity-20 transition-colors"
                >
                  <FiFileText className="w-4 h-4 mr-2" />
                  View Lease
                </Link>
                {/* <Link
                  to={`/messages?tenant=${tenant.id}`}
                  className="flex items-center justify-center px-3 py-2 bg-primary bg-opacity-10 text-primary rounded-md hover:bg-opacity-20 transition-colors"
                >
                  <FiMessageSquare className="w-4 h-4 mr-2" />
                  Message
                </Link> */}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
} 