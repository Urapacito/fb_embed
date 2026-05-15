import { onRequest as __share_r__id__js_onRequest } from "D:\\code\\embed\\functions\\share\\r\\[id].js"
import { onRequest as __api_embed_js_onRequest } from "D:\\code\\embed\\functions\\api\\embed.js"

export const routes = [
    {
      routePath: "/share/r/:id",
      mountPath: "/share/r",
      method: "",
      middlewares: [],
      modules: [__share_r__id__js_onRequest],
    },
  {
      routePath: "/api/embed",
      mountPath: "/api",
      method: "",
      middlewares: [],
      modules: [__api_embed_js_onRequest],
    },
  ]