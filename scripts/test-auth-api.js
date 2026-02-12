const { Client } = require('pg');
require('dotenv').config();

async function testAuth() {
  const connectionString = process.env.DATABASE_URL;
  const client = new Client({ connectionString });

  const testUser = {
    email: `test_${Date.now()}@example.com`,
    password: 'password123'
  };

  try {
    await client.connect();
    console.log('--- Testing Signup ---');
    
    // Simulate signup request
    const signupRes = await fetch('http://localhost:3000/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    const signupData = await signupRes.json();
    console.log('Signup Response:', signupRes.status, signupData);

    if (signupRes.ok) {
      console.log('--- Testing Login ---');
      const loginRes = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });
      const loginData = await loginRes.json();
      console.log('Login Response:', loginRes.status, loginData);
    }

    // Cleanup
    console.log('--- Cleaning up test user ---');
    await client.query('DELETE FROM users WHERE email = $1', [testUser.email]);
    console.log('Cleanup successful');

  } catch (err) {
    console.error('Test failed:', err.message);
  } finally {
    await client.end();
  }
}

testAuth();
