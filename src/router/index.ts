import { createRouter, createWebHashHistory } from "vue-router";
import Ellans from "../views/santa-circles/Ellans.vue";
import Cathy from "@/views/santa-circles/Cathy.vue";
import Cousins from "@/views/santa-circles/Cousins.vue";

const router = createRouter({
  history: createWebHashHistory("/Secret-Santa/"),
  routes: [
    {
      path: "/",
      name: "ellans",
      component: Ellans,
    },
    {
      path: "/cuzzies",
      name: "cuzzies",
      component: Cousins,
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
