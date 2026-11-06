// next/jest carga .env (PRODUCCIÓN) pero no pisa lo ya definido: base muerta y clave inválida para que ningún test toque producción.
process.env.DATABASE_URL = "postgresql://nadie@127.0.0.1:1/ninguna?connect_timeout=1";
process.env.DIRECT_URL = "postgresql://nadie@127.0.0.1:1/ninguna?connect_timeout=1";
process.env.ANTHROPIC_API_KEY = "sk-ant-jest-invalid";
process.env.TZ = "America/Mexico_City"; // los tests de fechas leen campos UTC; el huso fijo evita falsos verdes en CI
import type { Config } from "jest";
import nextJest from "next/jest.js";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
    "<rootDir>/e2e/",
  ],
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/app/**/layout.tsx",
    "!src/app/**/loading.tsx",
    "!src/app/**/error.tsx",
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
};

export default createJestConfig(config);
