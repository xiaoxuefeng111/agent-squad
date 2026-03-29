{
  "preset": "ts-jest",
  "testEnvironment": "node",
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1"
  },
  "testMatch": ["**/*.test.ts"],
  "collectCoverageFrom": ["src/**/*.ts", "!src/**/*.d.ts"],
  "coverageDirectory": "coverage",
  "coverageReporters": ["text", "lcov"]
}