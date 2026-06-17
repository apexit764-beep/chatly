const http = require('http');
const { spawn } = require('child_process');

const TOKEN = process.env.DEPLOY_TOKEN || 'sekaa-deploy-2026';
const PORT = Number(process.env.PORT || 9099);
let running = false;
let lastResult = 'no deploys yet';

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/deploy') {
    if (url.searchParams.get('token') !== TOKEN) {
      res.statusCode = 401; res.end('unauthorized\n'); return;
    }
    if (running) {
      res.statusCode = 409; res.end('a deploy is already running\n'); return;
    }
    running = true;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.write('>>> Deploy started at ' + new Date().toISOString() + '\n\n');
    const proc = spawn('/var/www/source.apexes.click/deploy.sh', [], { cwd: '/var/www/source.apexes.click' });
    proc.stdout.on('data', d => res.write(d));
    proc.stderr.on('data', d => res.write(d));
    proc.on('close', code => {
      lastResult = `last deploy exited ${code} at ${new Date().toISOString()}`;
      res.write(`\n>>> Deploy exited with code ${code}\n`);
      res.end();
      running = false;
    });
    return;
  }
  if (url.pathname === '/status') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end((running ? 'busy: deploy running\n' : 'idle\n') + lastResult + '\n');
    return;
  }
  res.statusCode = 404; res.end('not found\n');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('apex-sekaa-webhook listening on 127.0.0.1:' + PORT);
});
