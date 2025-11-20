import React from 'react';
import { CogIcon } from '@heroicons/react/24/outline';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure system settings and administrative preferences
        </p>
      </div>

      <div className="card p-12 text-center">
        <CogIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">System Settings</h3>
        <p className="mt-1 text-sm text-gray-500">
          System configuration and settings will be implemented here.
        </p>
      </div>
    </div>
  );
};

export default Settings;