import nextJest from "next/jest.js";

// next/jest reprend la configuration de Next.js (alias @/, CSS, variables d'environnement)
const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    // Le paquet server-only refuse d'être importé hors du serveur Next.js :
    // dans les tests, on le remplace par un module vide.
    "^server-only$": "<rootDir>/src/test/empty-module.ts",
  },
};

export default createJestConfig(config);
