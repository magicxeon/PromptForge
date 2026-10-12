import { installNetworkGuard } from './network-guard.mjs';

if (
  !['offline', 'postgres', 'loopback-http', 'postgres-http'].includes(process.env.MPF_AUTH_FIXTURE_NETWORK)
) {
  throw new Error('Explicit authentication fixture network mode required.');
}
installNetworkGuard({
  databaseEnv: ['postgres', 'postgres-http'].includes(process.env.MPF_AUTH_FIXTURE_NETWORK)
    ? process.env
    : undefined,
  loopbackHttp: ['loopback-http', 'postgres-http'].includes(process.env.MPF_AUTH_FIXTURE_NETWORK),
});
