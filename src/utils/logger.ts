const logger = {
  info: async (message: string, ...args: any[]): Promise<void> => {
    return new Promise((resolve) => {
      setImmediate(() => {
        console.log(`[INFO] ${message}`, ...args);
        resolve();
      });
    });
  },
  error: async (message: string, ...args: any[]): Promise<void> => {
    return new Promise((resolve) => {
      setImmediate(() => {
        console.error(`[ERROR] ${message}`, ...args);
        resolve();
      });
    });
  },
  warn: async (message: string, ...args: any[]): Promise<void> => {
    return new Promise((resolve) => {
      setImmediate(() => {
        console.warn(`[WARN] ${message}`, ...args);
        resolve();
      });
    });
  },
  debug: async (message: string, ...args: any[]): Promise<void> => {
    return new Promise((resolve) => {
      setImmediate(() => {
        console.debug(`[DEBUG] ${message}`, ...args);
        resolve();
      });
    });
  },
};

export default logger;
