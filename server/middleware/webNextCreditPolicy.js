import { timingSafeEqual } from 'node:crypto';
import { configuredWebNextCredits, withWebNextCreditPolicy } from '../domain/credits/WorkspaceCreditPolicy.js';
import { webNextCreditRoute, webNextProxyKey } from '../config/webNextProxy.js';
import { PROJECT_ROOT } from '../config/paths.js';

const header = 'x-mpf-web-next-proxy';
export function createWebNextCreditPolicy({ getKey = () => webNextProxyKey(PROJECT_ROOT), creditsEnabled = configuredWebNextCredits() } = {}) {
  let key;
  return (req, res, next) => {
    const supplied = req.headers[header];
    delete req.headers[header];
    const deny = () => res.status(403).json({error:{code:'web_next_proxy_denied',message:'Workspace unavailable.'}});
    const route = webNextCreditRoute(req.method, req.path);
    if (route === 'config' && !supplied) return deny();
    if (!supplied || !route) return next();
    if (!req.actorContext?.userId || !['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
      || typeof supplied !== 'string') return deny();
    key ??= getKey();
    if (!key) return deny();
    const a = Buffer.from(supplied), b = Buffer.from(key);
    if (a.length !== b.length || !timingSafeEqual(a,b)) return deny();
    if (route === 'estimate' && !creditsEnabled) return res.status(409).json({error:{code:'web_next_credits_disabled',message:'Reload workspace settings.'}});
    withWebNextCreditPolicy(req.actorContext, creditsEnabled);
    next();
  };
}
