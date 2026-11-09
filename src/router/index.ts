import { createRouter, createWebHistory } from "vue-router";
import MainView from "../views/MainView.vue";
export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: MainView },
    { path: "/s/:token", component: MainView, props: true },
    { path: "/admin", component: () => import("../views/AdminView.vue") },
    {
      path: "/admin/:id",
      component: () => import("../views/AdminView.vue"),
      props: true,
    },
    { path: "/:pathMatch(.*)*", component: MainView },
  ],
});
