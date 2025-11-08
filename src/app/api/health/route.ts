import { testConnection } from '@/lib/test-connection';
import { testOpenAI } from '@/lib/test-openai';

export async function GET() {
  const mongoOk = await testConnection();
  const openaiOk = await testOpenAI();

  return Response.json({
    status: 'ok',
    services: {
      mongodb: mongoOk,
      openai: openaiOk,
    },
  });
}