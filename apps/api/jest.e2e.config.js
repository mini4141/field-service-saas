module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "test",
  testRegex: ".*\.e2e-spec\.ts$",
  testTimeout: 30000,
  reporters: ["default", ["jest-junit", { outputDirectory: "reports", outputName: "api-e2e-junit.xml" }]],
};
