// API
export { adminApi, AdminApi } from './api/adminApi';

// Hooks
export { useProcessingRoles } from './hooks/useProcessingRoles';
export { useAdmin } from './hooks/useAdmin';

// UI Components
export { ProcessingRoleAssignment } from './ui/ProcessingRoleAssignment/ProcessingRoleAssignment';

// Constants
export {
  PROCESSING_ROLES,
  PROCESSING_ROLE_LABELS,
  PROCESSING_ROLE_COLORS,
  PROCESSING_ROLE_ICONS,
  PROCESSING_ROLE_DESCRIPTIONS
} from './lib/constants';

// Redux - Admin
export { default as adminReducer } from './model/slice';
export {
    fetchAllUsers,
    fetchAdmins,
    fetchStaff,
    createAdmin,
    createStaff,
    changeUserRole,
    deleteAdmin,
    deleteStaff,
    fetchWarehousesForSelection,
    fetchDistrictsForSelection,
    clearAdminErrors,
    clearOperationState,
    clearUsersList
} from './model/slice';

// Redux - Processing Roles
export { default as processingRolesReducer } from './model/processingRolesSlice';
export {
  fetchEmployeesWithProcessingRoles,
  assignProcessingRole,
  setFilters,
  clearFilters,
  clearError
} from './model/processingRolesSlice';