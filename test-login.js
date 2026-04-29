import http from 'http';

const loginData = JSON.stringify({ email: 'danieloti@church.com', password: 'password' }); // assuming simple password

const req = http.request({
  hostname: 'localhost',
  port: 5001,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': loginData.length
  }
}, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  const cookie = res.headers['set-cookie'];
  console.log(`COOKIE: ${cookie}`);
  
  if (!cookie) process.exit();
  const sid = cookie[0].split(';')[0];
  
  http.get({
    hostname: 'localhost',
    port: 5001,
    path: '/api/members/stats',
    headers: { 'Cookie': sid }
  }, (res2) => {
    res2.on('data', d => process.stdout.write(d));
    res2.on('end', () => console.log('\nDone'));
  });
});
req.write(loginData);
req.end();
