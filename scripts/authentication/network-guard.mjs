import net from 'node:net';
import tls from 'node:tls';
import dgram from 'node:dgram';
import dns from 'node:dns';
import { syncBuiltinESMExports } from 'node:module';
import { readDisposableDatabaseConfig } from '../../server/config/database.js';

export function installNetworkGuard({ databaseEnv, loopbackHttp = false } = {}) {
  // Validate before changing globals or permitting any network activity.
  const allowed = databaseEnv ? readDisposableDatabaseConfig(databaseEnv) : null;
  const restores = [];
  const ownedHttpPorts = new Set();
  const deny = () => {
    const error = new Error('Authentication fixture network access denied.');
    error.code = 'AUTH_FIXTURE_NETWORK_DENIED';
    throw error;
  };
  function replace(object, key, replacement) {
    const original = object[key];
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    restores.push(() => {
      if (descriptor) Object.defineProperty(object, key, descriptor);
      else delete object[key];
    });
    object[key] = replacement;
    return original;
  }
  const connect = replace(net.Socket.prototype, 'connect', function (...args) {
    const input = Array.isArray(args[0]) ? args[0] : args;
    const options = typeof input[0] === 'object' ? input[0] : { port: input[0], host: input[1] };
    if (
      options.path ||
      (!(loopbackHttp && options.host === '127.0.0.1' && ownedHttpPorts.has(Number(options.port))) &&
        (!allowed || options.host !== allowed.host || Number(options.port) !== allowed.port))
    )
      deny();
    return Reflect.apply(connect, this, args);
  });
  replace(tls, 'connect', deny);
  replace(dgram, 'createSocket', deny);
  const listen = replace(net.Server.prototype, 'listen', function (...args) {
    const options = typeof args[0] === 'object' ? args[0] : { port: args[0], host: args[1] };
    if (!loopbackHttp || options.path || options.host !== '127.0.0.1' || Number(options.port) !== 0) deny();
    let ownedPort;
    this.once('listening', () => {
      ownedPort = this.address().port;
      ownedHttpPorts.add(ownedPort);
    });
    this.once('close', () => ownedHttpPorts.delete(ownedPort));
    return Reflect.apply(listen, this, args);
  });
  for (const key of [
    'lookup',
    'lookupService',
    'resolve',
    'resolve4',
    'resolve6',
    'resolveAny',
    'resolveCaa',
    'resolveCname',
    'resolveMx',
    'resolveNaptr',
    'resolveNs',
    'resolvePtr',
    'resolveSoa',
    'resolveSrv',
    'resolveTlsa',
    'resolveTxt',
    'reverse',
  ]) {
    if (typeof dns[key] === 'function')
      replace(
        dns,
        key,
        key === 'lookup' && loopbackHttp
          ? (hostname, options, callback) => {
              if (hostname !== '127.0.0.1') return deny();
              const cb = typeof options === 'function' ? options : callback;
              queueMicrotask(() =>
                options?.all ? cb(null, [{ address: '127.0.0.1', family: 4 }]) : cb(null, '127.0.0.1', 4)
              );
            }
          : deny
      );
    if (typeof dns.promises[key] === 'function') replace(dns.promises, key, deny);
    for (const Resolver of [dns.Resolver, dns.promises.Resolver]) {
      if (typeof Resolver?.prototype[key] === 'function') replace(Resolver.prototype, key, deny);
    }
  }
  replace(globalThis, 'fetch', async () => deny());
  if (globalThis.WebSocket)
    replace(
      globalThis,
      'WebSocket',
      class {
        constructor() {
          deny();
        }
      }
    );
  syncBuiltinESMExports();
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    for (const restore of restores.reverse()) restore();
    syncBuiltinESMExports();
  };
}
