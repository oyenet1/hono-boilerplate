import { Hono } from "hono";
import { container } from "../di/container";
import { TYPES } from "../di/types";
import { PostController } from "../controllers/PostController";
import { authMiddleware } from "../middleware";

const posts = new Hono();
const postController = container.get<PostController>(TYPES.PostController);

posts.get("/", (c) => postController.getPosts(c));
posts.get("/:id", (c) => postController.getPost(c));
posts.post("/", authMiddleware, (c) => postController.createPost(c));
posts.put("/:id", authMiddleware, (c) => postController.updatePost(c));
posts.delete("/:id", authMiddleware, (c) => postController.deletePost(c));
posts.get("/my-posts", authMiddleware, (c) => postController.getUserPosts(c));

export { posts };
