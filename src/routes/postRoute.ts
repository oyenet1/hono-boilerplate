import { Hono } from "hono";
import { container } from "../di/container";
import { TYPES } from "../di/types";
import { PostController } from "../controllers/PostController";
import { secureAuthMiddleware, rateLimits } from "../middleware/security";

const postRoute = new Hono();
const postController = container.get<PostController>(TYPES.PostController);

// Apply API rate limiting to all post routes
postRoute.use("*", rateLimits.api);

// Public post routes
postRoute.get("/", rateLimits.public, (c) => postController.getPosts(c));
postRoute.get("/:id", rateLimits.public, (c) => postController.getPost(c));

// Protected post routes (require authentication)
postRoute.post("/", secureAuthMiddleware, (c) => postController.createPost(c));
postRoute.put("/:id", secureAuthMiddleware, (c) =>
  postController.updatePost(c)
);
postRoute.delete("/:id", secureAuthMiddleware, rateLimits.sensitive, (c) =>
  postController.deletePost(c)
);

// User-specific post routes
postRoute.get("/my-posts", secureAuthMiddleware, (c) =>
  postController.getUserPosts(c)
);

export { postRoute };
