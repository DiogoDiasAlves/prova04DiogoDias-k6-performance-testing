import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

// Métricas customizadas
export const getRequestDuration = new Trend('get_request_duration', true);
export const successRate = new Rate('success_rate');

// Configurações do teste
export const options = {
  stages: [
    { duration: '30s', target: 7 },   // Ramp-up: 0 -> 7 VUs em 30s
    { duration: '2m', target: 92 },   // Escala: 7 -> 92 VUs em 2min
    { duration: '1m', target: 92 }    // Sustentação: 92 VUs por 1min (total 3.5min)
  ],
  thresholds: {
    http_req_failed: ['rate<0.25'],              // Menos de 25% de erros
    get_request_duration: ['p(90)<6800'],        // 90% das respostas < 6800ms
    success_rate: ['rate>0.75']                  // Taxa de sucesso > 75%
  }
};

// Função para gerar relatório HTML e resumo no console
export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

// Função principal de teste
export default function () {
  const API_BASE_URL = 'https://jsonplaceholder.typicode.com/posts';
  const SUCCESS_STATUS = 200;

  const requestParams = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  // Executa requisição GET
  const response = http.get(API_BASE_URL, requestParams);

  // Registra duração da requisição na métrica TREND
  getRequestDuration.add(response.timings.duration);

  // Registra status de sucesso na métrica RATE
  successRate.add(response.status === SUCCESS_STATUS);

  // Validações
  check(response, {
    'Status code é 200': (r) => r.status === SUCCESS_STATUS,
    'Resposta contém dados': (r) => r.json().length > 0,
    'Tempo de resposta aceitável': (r) => r.timings.duration < 7000
  });

  // Pequena pausa entre iterações
  sleep(1);
}