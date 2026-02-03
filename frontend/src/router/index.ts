import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard'
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('@/views/Dashboard.vue')
    },
    {
      path: '/upload',
      name: 'upload',
      component: () => import('../views/Upload.vue')
    },
    {
      path: '/protocol-check',
      name: 'protocol-check',
      component: () => import('../views/ProtocolCheck.vue')
    },
    {
      path: '/protocol-compare',
      name: 'protocol-compare',
      component: () => import('../views/ProtocolCompare.vue')
    },
    {
      path: '/contacts',
      name: 'contacts',
      component: () => import('../views/Contacts.vue')
    },
    {
      path: '/contacts/:id/history',
      name: 'contact-history',
      component: () => import('../views/ContactHistory.vue')
    },
    {
      path: '/groups',
      name: 'groups',
      component: () => import('../views/Groups.vue')
    },
    {
      path: '/calls',
      name: 'calls',
      component: () => import('../views/Calls.vue')
    },
    {
      path: '/messages',
      name: 'messages',
      component: () => import('../views/Messages.vue')
    },
    {
      path: '/templates',
      name: 'templates',
      component: () => import('../views/Templates.vue')
    },
    {
      path: '/centralizator',
      name: 'centralizator',
      component: () => import('../views/Centralizator.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/Settings.vue')
    },
    {
      path: '/whatsapp-test',
      name: 'whatsapp-test',
      component: () => import('../views/WhatsAppTest.vue')
    },
    {
      path: '/orders',
      name: 'orders',
      component: () => import('../views/Orders.vue')
    },
    {
      path: '/orders/:id',
      name: 'order-detail',
      component: () => import('../views/OrderDetail.vue')
    },
    {
      path: '/orders/:id/planning',
      name: 'delivery-planning',
      component: () => import('../views/DeliveryPlanning.vue')
    }
  ]
});

export default router;

