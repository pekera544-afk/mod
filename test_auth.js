const https = require('https');

function get(path) {
  return new Promise((resolve) => {
    https.get('https://notalar.online' + path, (res) => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({ status: res.statusCode, body: b.slice(0, 200) }));
    }).on('error', e => resolve({ status: 0, body: e.message }));
  });
}

function post(path, body) {
  return new Promise((resolve) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'notalar.online',
      port: 443,
      path: path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw.slice(0, 300) }); }
      });
    });
    req.on('error', e => resolve({ status: 0, body: e.message }));
    req.write(data);
    req.end();
  });
}

async function main() {
  console.log('=== HEALTH CHECK ===');
  const h = await get('/health');
  console.log('Status:', h.status, '|', h.body);

  console.log('\n=== REGISTER TEST ===');
  const reg = await post('/api/auth/register', { username: 'testuser99', password: 'Test1234', email: 'testuser99@test.com' });
  console.log('Status:', reg.status);
  console.log('Body:', JSON.stringify(reg.body, null, 2));

  if (reg.status === 200 || reg.status === 201 || reg.status === 409) {
    console.log('\n=== LOGIN TEST ===');
    const login = await post('/api/auth/login', { email: 'testuser99@test.com', password: 'Test1234' });
    console.log('Status:', login.status);
    console.log('Body:', JSON.stringify(login.body, null, 2));
  }
}

main().catch(console.error);
