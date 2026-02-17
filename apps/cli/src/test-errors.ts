// Sample file with common vibecoded patterns for testing

// TODO: implement this function later
export function processData(input: any): any {
  // TODO: add validation
  const result = data.map((item) => {
    return transform(item);
  });
  return result;
}

// Not implemented yet
function calculateMetrics(): void {
  throw new Error("Not implemented");
}

// Debugging console.log in production code
export function greet(name: string): string {
  console.log("Debug: greeting", name);
  const temp = "Hello";
  return temp + " " + name;
}

// Empty catch block - silently swallows errors
try {
  const json = JSON.parse(userInput);
} catch {
  // Silently ignored
}

// Magic numbers without explanation
function calculatePrice(quantity: number): number {
  return quantity * 9.99 + 19.99 - 5;
}

// Generic variable names
const data = [];
const result = {};
const temp = "value";
const item = {};

// Function with empty body
export async function handleRequest() {
  // Implementation pending
}

// Hardcoded credentials (security issue)
const API_KEY = "sk-1234567890abcdef";
const DB_PASSWORD = "admin123";

// Missing type annotation
let count = 0;
function increment(val) {
  return val++;
}

// Unused variables
function unusedVars() {
  const unused = "this is not used";
  const anotherUnused = 42;
  return "hello";
}

// Commented out code
function commentedCode() {
  // const x = 1;
  // const y = 2;
  // return x + y;
  return 0;
}

// Nested callbacks (callback hell)
export function fetchData(callback) {
  getUser((err, user) => {
    if (err) {
      callback(err);
      return;
    }
    getOrders(user.id, (err, orders) => {
      if (err) {
        callback(err);
        return;
      }
      getProducts(orders, (err, products) => {
        callback(null, products);
      });
    });
  });
}
