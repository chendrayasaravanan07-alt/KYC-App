import React from 'react';
import { UserGroupIcon } from '@heroicons/react/24/outline';

const Users = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage and monitor all registered users in the system
        </p>
      </div>

      <div className="card p-12 text-center">
        <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">User Management</h3>
        <p className="mt-1 text-sm text-gray-500">
          User management interface will be implemented here.
        </p>
      </div>
    </div>
  );
};

export default Users;