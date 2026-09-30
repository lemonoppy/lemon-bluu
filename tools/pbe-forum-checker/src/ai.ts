import { GoogleGenAI, Type } from '@google/genai';

import { AiClassification, AiReview, EvaluatedPost } from './types';

const CLASSIFICATIONS: AiClassification[] = [
  'likely_human',
  'uncertain',
  'likely_ai',
];

function parseReview(value: string): AiReview {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Gemini returned an invalid review.');
  }

  const candidate = parsed as Partial<AiReview>;
  if (
    !candidate.classification ||
    !CLASSIFICATIONS.includes(candidate.classification) ||
    typeof candidate.confidence !== 'number' ||
    candidate.confidence < 0 ||
    candidate.confidence > 1 ||
    !Array.isArray(candidate.reasons) ||
    candidate.reasons.some((reason) => typeof reason !== 'string')
  ) {
    throw new Error('Gemini returned a review with an unexpected shape.');
  }

  return {
    classification: candidate.classification,
    confidence: candidate.confidence,
    reasons: candidate.reasons.slice(0, 3),
  };
}

export async function reviewEligiblePosts(
  posts: EvaluatedPost[],
): Promise<EvaluatedPost[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required when --ai is supplied.');
  }

  const client = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
  const reviewedPosts: EvaluatedPost[] = [];

  for (const post of posts) {
    if (!post.eligible) {
      reviewedPosts.push(post);
      continue;
    }

    console.log(`Reviewing post ${post.id} by ${post.username} with Gemini...`);
    const response = await client.models.generateContent({
      model,
      contents: [
        'Assess whether the forum reply below appears AI-generated. This is an ' +
          'imperfect writing-style signal, not proof. Do not treat polished grammar, ' +
          'non-native phrasing, or disability-related writing patterns alone as AI ' +
          'evidence. Choose likely_human, uncertain, or likely_ai; use uncertain when ' +
          'the text does not provide strong evidence. Give up to three short reasons.',
        `Forum reply:\n\n${post.body}`,
      ].join('\n\n'),
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            classification: {
              type: Type.STRING,
              enum: CLASSIFICATIONS,
            },
            confidence: {
              type: Type.NUMBER,
            },
            reasons: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
            },
          },
          required: ['classification', 'confidence', 'reasons'],
        },
      },
    });
    const responseText = response.text;
    if (!responseText) {
      throw new Error(`Gemini returned no review for post ${post.id}.`);
    }

    reviewedPosts.push({
      ...post,
      aiReview: parseReview(responseText),
    });
  }

  return reviewedPosts;
}
