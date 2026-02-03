import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import type { Order, OrderWithDetails, School, Structure, DeliveryGroup } from '@/types/order';

const API_BASE = '/api';

export const useOrdersStore = defineStore('orders', () => {
  const orders = ref<Order[]>([]);
  const currentOrder = ref<OrderWithDetails | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // Fetch all orders
  async function fetchOrders() {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.get(`${API_BASE}/orders`);
      orders.value = response.data.orders || [];
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      console.error('Error fetching orders:', err);
    } finally {
      loading.value = false;
    }
  }

  // Fetch single order with details
  async function fetchOrder(orderId: number) {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.get(`${API_BASE}/orders/${orderId}`);
      currentOrder.value = response.data.order;
      return response.data.order;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Create order
  async function createOrder(data: Partial<Order>) {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.post(`${API_BASE}/orders`, data);
      await fetchOrders();
      return response.data.order;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Update order
  async function updateOrder(orderId: number, data: Partial<Order>) {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.put(`${API_BASE}/orders/${orderId}`, data);
      await fetchOrders();
      if (currentOrder.value && currentOrder.value.id === orderId) {
        currentOrder.value = { ...currentOrder.value, ...response.data.order };
      }
      return response.data.order;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Delete order
  async function deleteOrder(orderId: number) {
    loading.value = true;
    error.value = null;
    try {
      await axios.delete(`${API_BASE}/orders/${orderId}`);
      await fetchOrders();
      if (currentOrder.value && currentOrder.value.id === orderId) {
        currentOrder.value = null;
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Create school
  async function createSchool(orderId: number, data: Partial<School>) {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.post(`${API_BASE}/orders/${orderId}/schools`, data);
      if (currentOrder.value && currentOrder.value.id === orderId) {
        await fetchOrder(orderId);
      }
      return response.data.school;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Update school
  async function updateSchool(orderId: number, schoolId: number, data: Partial<School>) {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.put(`${API_BASE}/orders/${orderId}/schools/${schoolId}`, data);
      if (currentOrder.value && currentOrder.value.id === orderId) {
        await fetchOrder(orderId);
      }
      return response.data.school;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Delete school
  async function deleteSchool(orderId: number, schoolId: number) {
    loading.value = true;
    error.value = null;
    try {
      await axios.delete(`${API_BASE}/orders/${orderId}/schools/${schoolId}`);
      if (currentOrder.value && currentOrder.value.id === orderId) {
        await fetchOrder(orderId);
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Create structure
  async function createStructure(orderId: number, schoolId: number, data: Partial<Structure>) {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.post(`${API_BASE}/orders/${orderId}/schools/${schoolId}/structures`, data);
      if (currentOrder.value && currentOrder.value.id === orderId) {
        await fetchOrder(orderId);
      }
      return response.data.structure;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Update structure
  async function updateStructure(orderId: number, schoolId: number, structureId: number, data: Partial<Structure>) {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.put(`${API_BASE}/orders/${orderId}/schools/${schoolId}/structures/${structureId}`, data);
      if (currentOrder.value && currentOrder.value.id === orderId) {
        await fetchOrder(orderId);
      }
      return response.data.structure;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Delete structure
  async function deleteStructure(orderId: number, schoolId: number, structureId: number) {
    loading.value = true;
    error.value = null;
    try {
      await axios.delete(`${API_BASE}/orders/${orderId}/schools/${schoolId}/structures/${structureId}`);
      if (currentOrder.value && currentOrder.value.id === orderId) {
        await fetchOrder(orderId);
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Create delivery group
  async function createDeliveryGroup(orderId: number, data: Partial<DeliveryGroup>) {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.post(`${API_BASE}/orders/${orderId}/delivery-groups`, data);
      if (currentOrder.value && currentOrder.value.id === orderId) {
        await fetchOrder(orderId);
      }
      return response.data.group;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Update delivery group
  async function updateDeliveryGroup(orderId: number, groupId: number, data: Partial<DeliveryGroup>) {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.put(`${API_BASE}/orders/${orderId}/delivery-groups/${groupId}`, data);
      if (currentOrder.value && currentOrder.value.id === orderId) {
        await fetchOrder(orderId);
      }
      return response.data.group;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Delete delivery group
  async function deleteDeliveryGroup(orderId: number, groupId: number) {
    loading.value = true;
    error.value = null;
    try {
      await axios.delete(`${API_BASE}/orders/${orderId}/delivery-groups/${groupId}`);
      if (currentOrder.value && currentOrder.value.id === orderId) {
        await fetchOrder(orderId);
      }
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Export order
  async function exportOrder(orderId: number, format: 'json' | 'xlsx' = 'json') {
    try {
      const response = await axios.post(`${API_BASE}/orders/${orderId}/export`, { format });
      return response.data.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || err.message);
    }
  }

  // Auto-group schools by proximity
  async function autoGroupSchools(orderId: number, maxDistance: number = 50, groupNamePrefix: string = 'Route') {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.post(`${API_BASE}/orders/${orderId}/auto-group`, { maxDistance, groupNamePrefix });
      if (currentOrder.value && currentOrder.value.id === orderId) {
        await fetchOrder(orderId);
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Optimize route for a delivery group
  async function optimizeRoute(orderId: number, groupId: number) {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.post(`${API_BASE}/orders/${orderId}/optimize-route/${groupId}`);
      if (currentOrder.value && currentOrder.value.id === orderId) {
        await fetchOrder(orderId);
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Bulk assign schools to a delivery group
  async function bulkAssignSchools(orderId: number, schoolIds: number[], groupId: number | null) {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.post(`${API_BASE}/orders/${orderId}/bulk-assign`, { schoolIds, groupId });
      if (currentOrder.value && currentOrder.value.id === orderId) {
        await fetchOrder(orderId);
      }
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  // Get delivery statistics
  async function getStatistics(orderId: number) {
    loading.value = true;
    error.value = null;
    try {
      const response = await axios.get(`${API_BASE}/orders/${orderId}/statistics`);
      return response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    orders,
    currentOrder,
    loading,
    error,
    fetchOrders,
    fetchOrder,
    createOrder,
    updateOrder,
    deleteOrder,
    createSchool,
    updateSchool,
    deleteSchool,
    createStructure,
    updateStructure,
    deleteStructure,
    createDeliveryGroup,
    updateDeliveryGroup,
    deleteDeliveryGroup,
    exportOrder,
    autoGroupSchools,
    optimizeRoute,
    bulkAssignSchools,
    getStatistics
  };
});

