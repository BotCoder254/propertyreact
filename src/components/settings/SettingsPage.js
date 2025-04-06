import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiBell, FiLock, FiMail, FiShield } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    twoFactorAuth: false,
    darkMode: false,
  });

  const handleToggle = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const settingsSections = [
    {
      title: 'Notifications',
      icon: <FiBell className="w-6 h-6" />,
      settings: [
        {
          name: 'emailNotifications',
          label: 'Email Notifications',
          description: 'Receive email notifications about your properties and tenants',
        },
        {
          name: 'smsNotifications',
          label: 'SMS Notifications',
          description: 'Receive text messages for urgent updates',
        },
      ],
    },
    {
      title: 'Security',
      icon: <FiShield className="w-6 h-6" />,
      settings: [
        {
          name: 'twoFactorAuth',
          label: 'Two-Factor Authentication',
          description: 'Add an extra layer of security to your account',
        },
      ],
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

      <div className="space-y-6">
        {settingsSections.map((section) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm p-6"
          >
            <div className="flex items-center mb-4">
              <div className="p-2 rounded-lg bg-primary bg-opacity-10 text-primary mr-3">
                {section.icon}
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {section.title}
              </h2>
            </div>

            <div className="space-y-4">
              {section.settings.map((setting) => (
                <div
                  key={setting.name}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {setting.label}
                    </h3>
                    <p className="text-sm text-gray-500">{setting.description}</p>
                  </div>
                  <div className="ml-4">
                    <button
                      type="button"
                      onClick={() => handleToggle(setting.name)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                        settings[setting.name] ? 'bg-primary' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          settings[setting.name] ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ))}

        {/* Account Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm p-6"
        >
          <div className="flex items-center mb-4">
            <div className="p-2 rounded-lg bg-primary bg-opacity-10 text-primary mr-3">
              <FiLock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Account Settings
            </h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiMail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={currentUser?.email}
                  disabled
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Save Changes
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 