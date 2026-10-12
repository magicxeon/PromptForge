import { installNetworkGuard } from './network-guard.mjs';

if (!['offline', 'postgres'].includes(process.env.MPF_AUTH_FIXTURE_NETWORK)) {
  throw new Error('Explicit authentication fixture network mode required.');
}
installNetworkGuard({ databaseEnv: process.env.MPF_AUTH_FIXTURE_NETWORK === 'postgres' ? process.env : undefined });
