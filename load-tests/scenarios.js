import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

// Test configuration
export const options = {
  scenarios: {
    // Smoke test
    smoke: {
      executor: 'constant-vus',
      vus: 1,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    // Load test
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 },  // Ramp up to 10 users
        { duration: '5m', target: 10 },  // Stay at 10 users
        { duration: '2m', target: 0 },   // Ramp down to 0 users
      ],
      tags: { test_type: 'load' },
    },
    // Stress test
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },  // Ramp up to 20 users
        { duration: '3m', target: 20 },  // Stay at 20 users
        { duration: '2m', target: 30 },  // Ramp up to 30 users
        { duration: '3m', target: 30 },  // Stay at 30 users
        { duration: '2m', target: 0 },   // Ramp down to 0 users
      ],
      tags: { test_type: 'stress' },
    },
    // Spike test
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },  // Quick ramp up to 50 users
        { duration: '2m', target: 50 },  // Stay at 50 users
        { duration: '1m', target: 0 },   // Quick ramp down to 0 users
      ],
      tags: { test_type: 'spike' },
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    'http_req_duration{type:auth}': ['p(95)<3000'], // Auth requests should be below 3s
    'http_req_duration{type:todo}': ['p(95)<1500'], // Todo requests should be below 1.5s
    errors: ['rate<0.1'], // Error rate should be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const users = new Map();

// Helper function to register a user
function registerUser(username) {
  const payload = {
    username: `${username}_${Date.now()}`,
    email: `${username}@test.com`,
    password: 'password123',
    name: `Test ${username}`
  };

  const res = http.post(`${BASE_URL}/register`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'auth' }
  });

  check(res, {
    'registration successful': (r) => r.status === 200,
  }) || errorRate.add(1);

  if (res.status === 200) {
    const body = JSON.parse(res.body);
    users.set(username, {
      token: body.token,
      id: body.user.id
    });
  }

  sleep(1);
}

// Helper function to login a user
function loginUser(username) {
  const payload = {
    usernameOrEmail: `${username}@test.com`,
    password: 'password123'
  };

  const res = http.post(`${BASE_URL}/login`, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    tags: { type: 'auth' }
  });

  check(res, {
    'login successful': (r) => r.status === 200,
  }) || errorRate.add(1);

  if (res.status === 200) {
    const body = JSON.parse(res.body);
    users.set(username, {
      token: body.token,
      id: body.user.id
    });
  }

  sleep(1);
}

// Helper function to create a todo
function createTodo(username) {
  const user = users.get(username);
  if (!user) return;

  const payload = {
    text: `Test todo ${Date.now()}`
  };

  const res = http.post(`${BASE_URL}/todos`, JSON.stringify(payload), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${user.token}`
    },
    tags: { type: 'todo' }
  });

  check(res, {
    'todo creation successful': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}

// Helper function to list todos
function listTodos(username) {
  const user = users.get(username);
  if (!user) return;

  const res = http.get(`${BASE_URL}/todos`, {
    headers: {
      'Authorization': `Bearer ${user.token}`
    },
    tags: { type: 'todo' }
  });

  check(res, {
    'todo list successful': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}

// Main test function
export default function() {
  const username = `user_${__VU}`;

  // Register or login based on whether the user exists
  if (!users.has(username)) {
    registerUser(username);
  } else if (Math.random() < 0.1) { // 10% chance to re-login
    loginUser(username);
  }

  // Perform todo operations
  if (users.has(username)) {
    if (Math.random() < 0.7) { // 70% chance to list todos
      listTodos(username);
    } else { // 30% chance to create todo
      createTodo(username);
    }
  }

  sleep(Math.random() * 3 + 1); // Random sleep between 1-4 seconds
} 