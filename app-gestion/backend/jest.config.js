module.exports = {
  testEnvironment: 'node',
  globalSetup: './test-setup.js',
  setupFiles: ["dotenv/config"],
  // setupFilesAfterEnv: ['./jest-setup-after-env.js'],
  testMatch: [
    "**/modules/**/*.test.js"
  ],
};