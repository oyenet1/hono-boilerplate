import { formatUptime } from "./src/utils/formatters";

// Test the formatUptime function
console.log("Testing formatUptime function:");
console.log("30 seconds:", formatUptime(30)); // Expected: "30s"
console.log("90 seconds:", formatUptime(90)); // Expected: "1m 30s"
console.log("3661 seconds:", formatUptime(3661)); // Expected: "1h 1m 1s"
console.log("3600 seconds:", formatUptime(3600)); // Expected: "1h"
console.log("7200 seconds:", formatUptime(7200)); // Expected: "2h"
console.log("3720 seconds:", formatUptime(3720)); // Expected: "1h 2m"
console.log("0 seconds:", formatUptime(0)); // Expected: "0s"
