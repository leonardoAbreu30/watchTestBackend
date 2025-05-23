import awsLambdaFastify from '@fastify/aws-lambda';
import { server } from './server';

// Remove the direct server.listen() call from server.ts
// The Lambda handler will handle the requests
export const handler = awsLambdaFastify(server); 