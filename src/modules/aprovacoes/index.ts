export { default as ApprovalsModule } from './ApprovalsModule';
export { useApprovalsModule, type ApprovalsActions } from './useApprovalsModule';
export { APPROVALS_CONFIGS, DURATION_TOLERANCE, REOPEN_OPTIONS, STATUS_META as APPROVAL_STATUS_META, VIEWERS } from './config';
export { createDemoApprovals, DEMO_CLIENTS, DEMO_NOW, DEMO_PEOPLE, DEMO_TODAY } from './mockData';
export * from './types';
export * from './rules';
