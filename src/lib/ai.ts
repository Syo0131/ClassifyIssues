import { GoogleGenerativeAI } from '@google/generative-ai';
import { AnalysisResult } from './types';

const SYSTEM_PROMPT = `You are an expert business analyst AI. Given a stakeholder request, you must analyze it and return a JSON object with the following fields:

- "category": One of: "Operations", "Billing & Finance", "Customer Service", "Product & Engineering", "IT & Security", "HR & People", "Marketing & Sales", "Compliance & Legal", "Strategy & Planning"
- "confidence": A number between 0 and 1 indicating your confidence in the category classification
- "issues": An array of 2-5 specific key issues extracted from the request. Each should be a concise, actionable problem statement.
- "actions": An array of 2-5 suggested next actions to address the issues. Each should be specific, practical, and prioritized.
- "summary": A single sentence that distills the core request.
- "priority": One of: "low", "medium", "high", "critical" — based on business impact and urgency implied in the request.

Return ONLY valid JSON, no markdown fences, no extra text.`;

export async function analyzeRequest(text: string): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'mock' || apiKey === '') {
    return mockAnalyze(text);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
        responseMimeType: "application/json",
      }
    });

    const result = await model.generateContent(text);
    const content = result.response.text();
    
    if (!content) throw new Error('Empty response from Gemini');

    const parsed = JSON.parse(content) as AnalysisResult;
    return validateResult(parsed);
  } catch (error) {
    console.error('Gemini API error, falling back to mock:', error);
    return mockAnalyze(text);
  }
}

function validateResult(result: AnalysisResult): AnalysisResult {
  const validCategories = [
    'Operations', 'Billing & Finance', 'Customer Service',
    'Product & Engineering', 'IT & Security', 'HR & People',
    'Marketing & Sales', 'Compliance & Legal', 'Strategy & Planning',
  ];
  const validPriorities = ['low', 'medium', 'high', 'critical'] as const;

  return {
    category: validCategories.includes(result.category) ? result.category : 'Operations',
    confidence: Math.min(1, Math.max(0, result.confidence || 0.5)),
    issues: Array.isArray(result.issues) ? result.issues.slice(0, 5) : ['Unable to extract issues'],
    actions: Array.isArray(result.actions) ? result.actions.slice(0, 5) : ['Review request manually'],
    summary: result.summary || 'Request requires manual review.',
    priority: validPriorities.includes(result.priority) ? result.priority : 'medium',
  };
}

// ─── Mock AI Fallback ─────────────────────────────────────────────────────────
// Uses keyword matching for classification when no API key is available.

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Billing & Finance': ['billing', 'invoice', 'payment', 'charge', 'refund', 'cost', 'price', 'fee', 'budget', 'expense', 'financial', 'revenue', 'accounting'],
  'Customer Service': ['customer', 'complaint', 'support', 'satisfaction', 'feedback', 'service', 'respond', 'wait time', 'help desk', 'ticket'],
  'Operations': ['delivery', 'shipping', 'logistics', 'supply chain', 'warehouse', 'inventory', 'tracking', 'delay', 'process', 'workflow', 'efficiency'],
  'Product & Engineering': ['feature', 'bug', 'software', 'app', 'platform', 'development', 'release', 'update', 'design', 'ux', 'ui', 'performance', 'crash'],
  'IT & Security': ['security', 'breach', 'password', 'access', 'vpn', 'network', 'server', 'downtime', 'backup', 'firewall', 'data loss', 'cyber'],
  'HR & People': ['hiring', 'employee', 'onboarding', 'training', 'retention', 'salary', 'benefits', 'culture', 'team', 'recruitment', 'turnover'],
  'Marketing & Sales': ['campaign', 'leads', 'conversion', 'brand', 'advertising', 'seo', 'social media', 'marketing', 'sales', 'funnel', 'engagement'],
  'Compliance & Legal': ['compliance', 'regulation', 'legal', 'policy', 'audit', 'gdpr', 'privacy', 'contract', 'liability', 'risk'],
  'Strategy & Planning': ['strategy', 'roadmap', 'planning', 'growth', 'expansion', 'vision', 'goals', 'objective', 'kpi', 'metrics', 'initiative'],
};

const PRIORITY_KEYWORDS: Record<string, string[]> = {
  critical: ['urgent', 'critical', 'emergency', 'immediately', 'asap', 'crisis', 'severe', 'outage', 'breach'],
  high: ['important', 'significant', 'major', 'escalat', 'serious', 'impact', 'growing', 'widespread'],
  medium: ['need', 'should', 'improve', 'address', 'track', 'monitor', 'help'],
  low: ['minor', 'eventually', 'nice to have', 'consider', 'explore', 'optional'],
};

function mockAnalyze(text: string): AnalysisResult {
  const lower = text.toLowerCase();

  // Classify category
  let bestCategory = 'Operations';
  let bestScore = 0;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  // Determine priority
  let priority: AnalysisResult['priority'] = 'medium';
  for (const [p, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      priority = p as AnalysisResult['priority'];
      break;
    }
  }

  // Extract issues — split on common delimiters and filter
  const sentences = text
    .split(/[.!?\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  const issues = sentences.length > 0
    ? sentences.slice(0, 4).map(s => s.replace(/^(we need |help |i need |please )/i, '').trim())
    : [`Address ${bestCategory.toLowerCase()} concerns raised in the request`];

  // Generate actions based on category
  const categoryActions: Record<string, string[]> = {
    'Billing & Finance': [
      'Audit recent billing records for discrepancies',
      'Implement automated billing alerts for customers',
      'Schedule review meeting with the finance team',
    ],
    'Customer Service': [
      'Set up a dedicated tracking system for complaints',
      'Create escalation protocols for recurring issues',
      'Implement customer satisfaction surveys post-resolution',
    ],
    'Operations': [
      'Map current process workflow to identify bottlenecks',
      'Implement real-time tracking and monitoring dashboards',
      'Establish SLA benchmarks and automated alerts',
    ],
    'Product & Engineering': [
      'Prioritize reported issues in the product backlog',
      'Schedule sprint planning for critical fixes',
      'Conduct user research to validate feature requests',
    ],
    'IT & Security': [
      'Conduct immediate security assessment',
      'Review and update access control policies',
      'Implement monitoring and alerting systems',
    ],
    'HR & People': [
      'Review current HR policies and identify gaps',
      'Schedule stakeholder interviews for deeper understanding',
      'Develop an action plan with measurable milestones',
    ],
    'Marketing & Sales': [
      'Analyze current campaign performance metrics',
      'Develop targeted outreach strategy',
      'Set up A/B testing framework for optimization',
    ],
    'Compliance & Legal': [
      'Conduct compliance gap analysis',
      'Review and update relevant policies',
      'Schedule legal consultation for risk assessment',
    ],
    'Strategy & Planning': [
      'Facilitate strategic planning workshop',
      'Define measurable KPIs and success criteria',
      'Create phased implementation roadmap',
    ],
  };

  const actions = categoryActions[bestCategory] || [
    'Schedule a discovery meeting with stakeholders',
    'Document detailed requirements',
    'Create a prioritized action plan',
  ];

  // Build summary
  const firstSentence = sentences[0] || text.slice(0, 100);
  const summary = `Stakeholder requests support with ${bestCategory.toLowerCase()}-related concerns: ${firstSentence.toLowerCase().slice(0, 80)}...`;

  return {
    category: bestCategory,
    confidence: Math.min(0.95, 0.5 + bestScore * 0.12),
    issues,
    actions,
    summary: summary.length > 200 ? summary.slice(0, 197) + '...' : summary,
    priority,
  };
}
