import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'https://bot.bj';
const pageErrors = new Rate('apresbac_page_errors');
const pageDuration = new Trend('apresbac_page_duration', true);

export const options = {
  scenarios: {
    public_page_1000_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '60s', target: 250 },
        { duration: '60s', target: 500 },
        { duration: '60s', target: 1000 },
        { duration: '2m', target: 1000 },
        { duration: '45s', target: 0 },
      ],
      gracefulRampDown: '20s',
      exec: 'loadPublicPage',
    },
    health_endpoint_controlled: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '4m',
      preAllocatedVUs: 20,
      maxVUs: 100,
      startTime: '30s',
      exec: 'checkHealth',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    apresbac_page_errors: ['rate<0.01'],
    'http_req_duration{scenario:public_page_1000_users}': [
      'p(95)<1500',
      'p(99)<3000',
    ],
  },
  discardResponseBodies: false,
};

export function loadPublicPage() {
  const response = http.get(`${BASE_URL}/apresbacia`, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'Cache-Control': 'no-cache',
    },
    tags: { component: 'apresbac-public-page' },
  });

  pageDuration.add(response.timings.duration);

  const valid = check(response, {
    'page HTTP 200': (result) => result.status === 200,
    'page contains AprèsBac IA': (result) => result.body?.includes('AprèsBac IA'),
    'page loads production v2.17': (result) => result.body?.includes('production-finalization-v2_17.js'),
  });

  pageErrors.add(!valid);
  sleep(Math.random() * 3 + 2);
}

export function checkHealth() {
  const response = http.post(
    'https://mvynepqulhflxtyymtzs.supabase.co/functions/v1/waouh-apresbac-chat',
    JSON.stringify({
      action: 'health',
      context: {
        locale: 'fr-BJ',
        channel: 'production-load-check',
      },
    }),
    {
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
        Origin: BASE_URL,
      },
      tags: { component: 'apresbac-health' },
    },
  );

  check(response, {
    'health HTTP 200': (result) => result.status === 200,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: JSON.stringify(data, null, 2),
    'apresbac-load-test-summary.json': JSON.stringify(data, null, 2),
  };
}
