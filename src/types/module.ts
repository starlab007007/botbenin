export interface ModuleStep {
  number: number;
  title: string;
  duration: string;
  actions: string[];
  screenshot?: string;
  expectedResult: string;
  commonErrors?: Array<{
    error: string;
    solution: string;
  }>;
}

export interface ModuleFeature {
  name: string;
  description: string;
  advantage: string;
  howToUse: string[];
}

export interface ModuleUseCase {
  sector: string;
  icon: string;
  problem: string;
  solution: string;
  result: string;
  testimonial?: {
    quote: string;
    author: string;
    company: string;
  };
}

export interface ModuleROI {
  metricsComparison: Array<{
    metric: string;
    before: string;
    after: string;
    improvement: string;
  }>;
  investment: {
    monthlyPrice: number;
    setupTime: string;
    totalYearOne: number;
  };
  gains: {
    labourSavings: number;
    revenueIncrease: number;
    totalYearOne: number;
  };
  roiPercentage: number;
  paybackPeriod: string;
}

export interface CompleteModuleData {
  id: string;
  icon: string;
  title: string;
  category: 'IA' | 'Communication' | 'Support' | 'Core';
  badge?: 'New' | 'Pro' | 'Premium' | 'Popular';
  
  presentation: {
    shortDescription: string;
    fullDescription: string[];
    videoUrl?: string;
    screenshots: string[];
  };
  
  features: ModuleFeature[];
  
  workflow: {
    mermaidCode: string;
    stepsExplanation: Array<{
      step: number;
      title: string;
      description: string;
    }>;
  };
  
  stepByStep: {
    prerequisites: string[];
    estimatedTime: string;
    steps: ModuleStep[];
    finalResult: {
      description: string;
      metrics?: string[];
    };
  };
  
  useCases: ModuleUseCase[];
  
  roi: ModuleROI;
  
  pricing: {
    plansComparison: Array<{
      plan: string;
      price: number;
      included: boolean;
      limits: string;
    }>;
    recommendation: string;
  };
  
  faq: Array<{
    question: string;
    answer: string;
  }>;
  
  resources: Array<{
    type: string;
    description: string;
    format: string;
    size: string;
    url: string;
  }>;
  
  metadata: {
    difficulty: 'débutant' | 'intermédiaire' | 'avancé';
    estimatedSetupTime: string;
    minimumPlan: string;
    integrations: string[];
    tags: string[];
  };
}
