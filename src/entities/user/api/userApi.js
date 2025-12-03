import { createApiModule } from '@shared/services/ApiClient';

const userApi = createApiModule('/api/users');
const employeeApi = createApiModule('/api/employee');

export const userApiMethods = {
    // Получение всех пользователей (для админа)
    getAllUsers: (params = {}) => userApi.get('', params),

    // Получение пользователя по ID
    getUserById: (id) => userApi.get(`/${id}`),

    // Получение клиентов
    getClients: (params = {}) => userApi.get('/clients', params),

    // Получение сотрудников
    getEmployees: (params = {}) => userApi.get('/employees', params),

    // Получение поставщиков
    getSuppliers: (params = {}) => userApi.get('/suppliers', params),

    // Получение поставщика по ID
    getSupplierById: (id) => userApi.get(`/suppliers/${id}`),

    // Получение водителей
    getDrivers: (params = {}) => userApi.get('/drivers', params),

    // Получение всех водителей без пагинации
    getAllDrivers: () => userApi.get('/drivers/all'),

    // Получение водителя по ID
    getDriverById: (id) => userApi.get(`/drivers/${id}`),

    // Получение остановок водителя
    getDriverStops: (id, params = {}) => userApi.get(`/drivers/${id}/stops`, params),
};

// API методы для работы с сотрудниками и их районами
export const employeeApiMethods = {
    // Получение всех сотрудников с их районами
    getAllEmployees: () => employeeApi.get('/all'),

    // Получение сотрудника по ID с детальной информацией
    getEmployeeById: (id) => employeeApi.get(`/${id}/details`),

    // Обновление районов сотрудника (только для админов)
    updateEmployeeDistricts: (employeeId, districts) => 
        employeeApi.put(`/${employeeId}/districts`, { districts }),

    // Получение сотрудников по району
    getEmployeesByDistrict: (districtId) => employeeApi.get(`/district/${districtId}`),

    // Получение статистики по районам
    getDistrictStats: () => employeeApi.get('/stats/districts'),

    // Обновление склада сотрудника (только для админов)
    updateEmployeeWarehouse: (employeeId, warehouseId) => 
        employeeApi.put(`/${employeeId}/warehouse`, { warehouseId }),
};

// API методы для работы с водителями
const driverApi = createApiModule('/api/drivers');

export const driverApiMethods = {
    // Получение районов водителя
    getDriverDistricts: (driverId) => driverApi.get('/districts', { driverId }),

    // Обновление районов водителя
    updateDriverDistricts: (driverId, districts) => 
        driverApi.put('/districts', { driverId, districts }),

    // Получение склада водителя
    getDriverWarehouse: (driverId) => driverApi.get('/warehouse', { driverId }),

    // Обновление склада водителя
    updateDriverWarehouse: (driverId, warehouseId) => 
        driverApi.put('/warehouse', { driverId, warehouseId }),
};

export { userApiMethods as userApi, employeeApiMethods as employeeApi, driverApiMethods as driverApi };