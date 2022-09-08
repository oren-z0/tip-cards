import { createRouter, createWebHistory } from 'vue-router'

import PageIndex from '@/pages/PageIndex.vue'
import PageLanding from '@/pages/PageLanding.vue'
import PageCodes from '@/pages/PageCodes.vue'
import PageCards from '@/pages/PageCards.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      name: 'home',
      component: PageIndex,
    },
    {
      path: '/landing/',
      name: 'landing',
      component: PageLanding,
    },
    {
      path: '/codes/:withdrawId?',
      name: 'codes',
      component: PageCodes,
    },
    {
      path: '/cards/:setId?/:settings?',
      name: 'cards',
      component: PageCards,
    },
  ],
})

export default router
