module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  reporters: ["default", ["jest-junit", { outputDirectory: "../reports", outputName: "unit-junit.xml" }]],
};
