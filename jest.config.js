module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
    transform: {
      '^.+\\.tsx?$': ['ts-jest', {
        tsconfig: 'tsconfig.json',
        diagnostics: {
          ignoreCodes: [151001]
        }
      }]
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  };