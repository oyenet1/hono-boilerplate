// Global imports - these will be available without explicit imports

declare global {
  var logger: typeof import('@/utils/logger').default;
  var config: typeof import('@/config/app').default;
  var db: typeof import('@/database/connection').default;
}

export {};
  // Add more auto-imports as needed
  // var yourUtility: typeof import('@/utils/yourUtility').default;
}

export {};
