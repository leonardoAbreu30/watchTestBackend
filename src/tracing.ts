import opentelemetry from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify';

const sdk = new NodeSDK({
  serviceName: 'todo-backend',
  traceExporter: new OTLPTraceExporter({
    url: process.env.JAEGER_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations(),
    new FastifyInstrumentation(),
  ],
});

export default sdk; 