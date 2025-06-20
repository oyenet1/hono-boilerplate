/**
 * Async JSON utilities to prevent blocking operations
 * Especially useful for large objects or high-throughput scenarios
 */

/**
 * Async JSON.stringify to avoid blocking the event loop
 */
export const stringifyAsync = async (obj: any): Promise<string> => {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      try {
        resolve(JSON.stringify(obj));
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Async JSON.parse to avoid blocking the event loop
 */
export const parseAsync = async (str: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    setImmediate(() => {
      try {
        resolve(JSON.parse(str));
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Safe async JSON.parse that returns null on error
 */
export const safeParse = async (str: string): Promise<any | null> => {
  try {
    return await parseAsync(str);
  } catch {
    return null;
  }
};

/**
 * Safe async JSON.stringify that returns empty string on error
 */
export const safeStringify = async (obj: any): Promise<string> => {
  try {
    return await stringifyAsync(obj);
  } catch {
    return "";
  }
};
