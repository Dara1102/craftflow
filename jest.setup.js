// Jest setup file
// Add any global test setup here

// Mock environment variables if needed
process.env.NODE_ENV = 'test'

// Extend Jest matchers
// import '@testing-library/jest-dom' // Uncomment for React component tests

// Global test timeout (default is 5000ms)
jest.setTimeout(10000)

// Mock console.error to fail tests on React warnings (optional)
// const originalError = console.error
// beforeAll(() => {
//   console.error = (...args) => {
//     if (/Warning/.test(args[0])) {
//       throw new Error(args[0])
//     }
//     originalError.call(console, ...args)
//   }
// })
// afterAll(() => {
//   console.error = originalError
// })
