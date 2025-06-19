import { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { verify } from "hono/jwt";
import { appConfig } from "../config/app";
import { TokenExtractor } from "../utils/tokenExtractor";

export const authMiddleware = async (c: Context, next: Next) => {
  const token = TokenExtractor.getToken(c);

  try {
    const decoded = (await verify(token, appConfig.jwt.secret)) as {
      userId: number;
    };
    c.set("userId", decoded.userId);
    await next();
  } catch (error) {
    throw new HTTPException(401, {
      message: "Your session has expired. Please login again",
    });
  }
};

export const corsMiddleware = async (c: Context, next: Next) => {
  c.header("Access-Control-Allow-Origin", appConfig.cors.origin);
  c.header(
    "Access-Control-Allow-Methods",
    appConfig.cors.allowMethods.join(", ")
  );
  c.header(
    "Access-Control-Allow-Headers",
    appConfig.cors.allowHeaders.join(", ")
  );

  if (c.req.method === "OPTIONS") {
    return c.text("", 200);
  }

  await next();
};

export const loggerMiddleware = async (c: Context, next: Next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.url} - ${c.res.status} - ${ms}ms`);
};

export const errorHandler = (err: Error, c: Context) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  console.error("Unhandled error:", err);
  return c.json({ error: "Internal Server Error" }, 500);
};
