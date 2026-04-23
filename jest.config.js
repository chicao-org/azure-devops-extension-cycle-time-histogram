module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/__tests__/**'
    ],
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 60,
            lines: 60,
            statements: 60
        }
    },
    moduleNameMapper: {
        '^azure-devops-extension-sdk$': '<rootDir>/jest.mocks/azure-devops-sdk.ts',
        '^azure-devops-extension-api$': '<rootDir>/jest.mocks/azure-devops-api.ts',
        '^azure-devops-extension-api/WorkItemTracking$': '<rootDir>/jest.mocks/azure-devops-api.ts'
    }
};