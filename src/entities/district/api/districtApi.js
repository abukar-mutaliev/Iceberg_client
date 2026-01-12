import { createProtectedRequest, createPublicRequest } from '@shared/api/api';

export const districtApi = {
  // Получение всех районов (публичный метод)
  async getAllDistricts() {
    return createPublicRequest('get', '/api/districts');
  },

  // Получение районов для выбора (защищенный метод)
  async getDistrictsForSelection() {
    return createProtectedRequest('get', '/api/admin/districts/selection');
  },

  // Получение информации о районе
  async getDistrictById(districtId) {
    return createPublicRequest('get', `/api/districts/${districtId}`);
  }
};

