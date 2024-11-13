import { createRouter, createWebHashHistory  } from "vue-router";
import Ellans from "../views/santa-circles/Ellans.vue";
import Cathy from "@/views/santa-circles/Cathy.vue";

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "ellans",
      component: Ellans,
    },
    {
      path: "/cathy",
      name: "cathy",
      component: Cathy,
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      // component: () => import("../views/santa-circles/Cathy.vue"),
    },
  ],
});

export default router;
