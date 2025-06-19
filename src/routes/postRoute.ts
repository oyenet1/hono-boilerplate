import { Hono } from "hono";
import { container } from "../di/container";
import { TYPES } from "../di/types";
import { PostController } from "../controllers/PostController";
import { secureAuthMiddleware, rateLimits } from "../middleware/security";
import {
  validateJson,
  validateParam,
  validateQuery,
} from "../utils/zValidator";
import { CreatePostDto, UpdatePostDto, PaginationDto } from "../dtos";
import { z } from "zod";

const postRoute = new Hono();
const postController = container.get<PostController>(TYPES.PostController);

// Parameter validation schema
const PostIdSchema = z.object({
  id: z.string().min(1, "Post ID is required"),
});

// Apply API rate limiting to all post routes
postRoute.use("*", rateLimits.api);

// Public post routes (with validation)
postRoute.get("/", rateLimits.public, validateQuery(PaginationDto), (c) =>
  postController.getPosts(c)
);
postRoute.get("/:id", rateLimits.public, validateParam(PostIdSchema), (c) =>
  postController.getPost(c)
);

// Protected post routes (require authentication and validation)
postRoute.post("/", secureAuthMiddleware, validateJson(CreatePostDto), (c) =>
  postController.createPost(c)
);
postRoute.put(
  "/:id",
  secureAuthMiddleware,
  validateParam(PostIdSchema),
  validateJson(UpdatePostDto),
  (c) => postController.updatePost(c)
);
postRoute.delete(
  "/:id",
  secureAuthMiddleware,
  rateLimits.sensitive,
  validateParam(PostIdSchema),
  (c) => postController.deletePost(c)
);

// User-specific post routes
postRoute.get(
  "/my-posts",
  secureAuthMiddleware,
  validateQuery(PaginationDto),
  (c) => postController.getUserPosts(c)
);

export { postRoute };
