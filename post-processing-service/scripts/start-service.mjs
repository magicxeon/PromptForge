import { spawnSync } from 'node:child_process';
import { loadPostProcessingConfig } from '../config/serviceConfig.mjs';
import { createPostProcessingServer } from '../api/server.mjs';
import { ensureFaceModel } from '../setupModel.mjs';

const defaultToken = 'dev-internal-token-change-in-production-32bytes';

function freePort(port) {
  if (process.platform === 'win32') {
    try {
      const result = spawnSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8', windowsHide: true });
      if (result.status === 0 && result.stdout) {
        const lines = result.stdout.split(/\r?\n/);
        const regex = new RegExp(`TCP\\s+\\S+:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`, 'i');
        const pids = new Set();
        for (const line of lines) {
          const match = line.trim().match(regex);
          if (match && match[1] && Number(match[1]) !== process.pid) {
            pids.add(match[1]);
          }
        }
        for (const pid of pids) {
          console.log(`Port ${port} is in use by process PID ${pid}. Terminating process...`);
          spawnSync('taskkill', ['/PID', pid, '/T', '/F'], { stdio: 'ignore', windowsHide: true });
        }
      }
    } catch {
      /* ignore cleanup errors */
    }
  }
}

async function main() {
  process.env.POST_PROCESSING_PILOT_ENABLED = process.env.POST_PROCESSING_PILOT_ENABLED ?? 'true';
  process.env.POST_PROCESSING_INTERNAL_TOKEN = process.env.POST_PROCESSING_INTERNAL_TOKEN || defaultToken;

  const config = loadPostProcessingConfig();

  // Free port 6501 if previously occupied
  freePort(config.runtime.port);

  console.log('Preparing Face Landmarker model...');
  try {
    await ensureFaceModel({ config });
    console.log('Model artifact verified.');
  } catch (error) {
    console.warn('Face Landmarker model warning: ' + error.message);
    console.warn('Starting service with model capabilities marked unavailable.');
  }

  const server = await createPostProcessingServer({ config });
  const host = config.runtime.host;
  const port = config.runtime.port;
  const token = config.runtime.internalToken;

  server.on('error', error => {
    if (error.code === 'EADDRINUSE') {
      console.error(`\nError: Port ${port} is already in use by another process.`);
      console.error('Please close any process occupying port ' + port + ' and try again.\n');
    } else {
      console.error('Server error:', error);
    }
    process.exit(1);
  });

  server.listen(port, host, () => {
    console.log('\n=============================================================');
    console.log('   Post-Processing Microservice (Isolated Standalone Mode)');
    console.log('=============================================================');
    console.log(`   URL:          http://${host}:${port}`);
    console.log(`   InternalToken:${token}`);
    console.log(`   Pilot Mode:   ${config.runtime.pilotEnabled ? 'ENABLED' : 'DISABLED'}`);
    console.log('-------------------------------------------------------------');
    console.log('   Available Endpoints (JSON Format):');
    console.log(`   - GET  http://${host}:${port}/health`);
    console.log(`   - GET  http://${host}:${port}/v1/health`);
    console.log(`   - GET  http://${host}:${port}/v1/capabilities`);
    console.log(`   - GET  http://${host}:${port}/v1/metrics`);
    console.log(`   - POST http://${host}:${port}/v1/faceless-previs`);
    console.log(`   - POST http://${host}:${port}/v1/face-landmarks`);
    console.log('=============================================================\n');
    console.log('Ready for isolated cURL / Postman testing. Press Ctrl+C to stop.');
  });

  const shutdown = async () => {
    console.log('\nStopping Post-Processing Service...');
    server.close(() => {
      console.log('Service stopped.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(error => {
  console.error('Failed to start Post-Processing Service:', error);
  process.exit(1);
});
