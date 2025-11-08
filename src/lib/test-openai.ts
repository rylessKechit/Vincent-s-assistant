import OpenAI from 'openai';

export async function testOpenAI() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  try {
    const embedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: "Test embedding",
    });
    console.log('✅ OpenAI connection successful');
    return true;
  } catch (error) {
    console.error('❌ OpenAI connection failed:', error);
    return false;
  }
}