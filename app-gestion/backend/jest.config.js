module.exports = {
  testEnvironment: 'node',
  globalSetup: './test-setup.js',
  setupFiles: ["dotenv/config"],
  testMatch: [
    "**/modules/**/*.test.js"
  ],
};