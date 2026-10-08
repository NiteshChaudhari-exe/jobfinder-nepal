import assert from 'node:assert/strict';
import { once } from 'node:events';
import express from 'express';
import jwt from 'jsonwebtoken';
import test from 'node:test';

import Application from '../src/models/Application.js';
import Company from '../src/models/Company.js';
import Job from '../src/models/Job.js';
import User from '../src/models/User.js';
import applicationRoutes from '../src/routes/applications.js';
import authRoutes from '../src/routes/auth.js';
import jobRoutes from '../src/routes/jobs.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret-with-more-than-32-characters';

const queryResult = (value) => {
  const query = {
    populate() {
      return query;
    },
    sort() {
      return query;
    },
    then(resolve, reject) {
      return Promise.resolve(value).then(resolve, reject);
    }
  };

  return query;
};

const startTestServer = async (context) => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/applications', applicationRoutes);

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  context.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));

  const address = server.address();
  return `http://127.0.0.1:${address.port}/api`;
};

const authHeader = (id, role) => ({
  Authorization: `Bearer ${jwt.sign({ id, role }, process.env.JWT_SECRET)}`
});

test('public registration rejects administrator role before writing a user', async (context) => {
  const baseUrl = await startTestServer(context);
  context.mock.method(User, 'findOne', () => {
    throw new Error('User query must not run for a forbidden role');
  });

  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Unauthorized Admin',
      email: 'blocked@example.test',
      password: 'example-password',
      role: 'admin'
    })
  });

  assert.equal(response.status, 400);
});

test('public job detail lookup filters to published listings', async (context) => {
  const baseUrl = await startTestServer(context);
  context.mock.method(Job, 'findOne', (filter) => {
    assert.deepEqual(filter, { _id: 'draft-job-id', status: 'Published' });
    return queryResult(null);
  });

  const response = await fetch(`${baseUrl}/jobs/draft-job-id`);
  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: 'Job not found' });
});

test('employers cannot submit candidate applications', async (context) => {
  const baseUrl = await startTestServer(context);
  context.mock.method(Application, 'create', () => {
    throw new Error('Employer application must not be created');
  });

  const response = await fetch(`${baseUrl}/applications`, {
    method: 'POST',
    headers: {
      ...authHeader('employer-1', 'employer'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      job: 'published-job-id',
      resumeUrl: 'https://example.test/resume.pdf',
      coverLetter: 'Test application'
    })
  });

  assert.equal(response.status, 403);
});

test('employer application listing is restricted to the applicant identity', async (context) => {
  const baseUrl = await startTestServer(context);
  context.mock.method(Application, 'find', (filter) => {
    assert.deepEqual(filter, { applicant: 'candidate-1' });
    return queryResult([]);
  });

  const response = await fetch(`${baseUrl}/applications`, {
    headers: authHeader('candidate-1', 'user')
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), []);
});

test('job creation ignores employer-supplied ownership IDs', async (context) => {
  const baseUrl = await startTestServer(context);
  context.mock.method(Company, 'findOne', (filter) => {
    assert.deepEqual(filter, { name: 'Example Company', owner: 'employer-1' });
    return Promise.resolve({ _id: 'company-1' });
  });

  let createdJob;
  context.mock.method(Job, 'create', (document) => {
    createdJob = document;
    return Promise.resolve({ _id: 'job-1', ...document });
  });

  const response = await fetch(`${baseUrl}/jobs`, {
    method: 'POST',
    headers: {
      ...authHeader('employer-1', 'employer'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      title: 'Test role',
      description: 'A role for testing.',
      location: 'Kathmandu',
      companyName: 'Example Company',
      employerId: 'victim-employer'
    })
  });

  assert.equal(response.status, 201);
  assert.equal(createdJob.employer, 'employer-1');
});

test('an employer cannot edit another employer job', async (context) => {
  const baseUrl = await startTestServer(context);
  context.mock.method(Job, 'findById', () => Promise.resolve({ employer: 'employer-2' }));

  const response = await fetch(`${baseUrl}/jobs/job-owned-by-someone-else`, {
    method: 'PATCH',
    headers: {
      ...authHeader('employer-1', 'employer'),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ title: 'Unauthorized edit' })
  });

  assert.equal(response.status, 403);
});
