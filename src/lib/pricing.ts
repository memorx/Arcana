export interface CreditPackage {
  id: string;
  credits: number;
  price: number; // cents USD
  priceDisplay: string;
  popular: boolean;
  description: string;
  descriptionEs: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "pack_5",
    credits: 5,
    price: 199,
    priceDisplay: "$1.99",
    popular: false,
    description: "2-5 readings",
    descriptionEs: "2-5 lecturas",
  },
  {
    id: "pack_15",
    credits: 15,
    price: 499,
    priceDisplay: "$4.99",
    popular: true,
    description: "5-15 readings",
    descriptionEs: "5-15 lecturas",
  },
  {
    id: "pack_30",
    credits: 30,
    price: 899,
    priceDisplay: "$8.99",
    popular: false,
    description: "10-30 readings",
    descriptionEs: "10-30 lecturas",
  },
];

export function getPackageById(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === id);
}

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  nameEs: string;
  price: number; // cents USD
  priceDisplay: string;
  creditsCost: number; // cost in credits per month
  creditsCostDisplay: string;
  interval: 'month' | 'year';
  features: string[];
  featuresEs: string[];
  freeReadingsPerMonth: number;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'daily_oracle',
    name: 'Daily Oracle',
    nameEs: 'Oráculo Diario',
    price: 399,
    priceDisplay: '$3.99/mo',
    creditsCost: 10,
    creditsCostDisplay: '10 credits/mo',
    interval: 'month',
    features: [
      'Personalized daily card reading',
      'Based on your zodiac sign',
      '1 free complete reading/month',
      'Email delivery at your preferred time',
      'Cancel anytime',
    ],
    featuresEs: [
      'Carta diaria personalizada',
      'Basada en tu signo zodiacal',
      '1 lectura completa gratis/mes',
      'Email a tu hora preferida',
      'Cancela cuando quieras',
    ],
    freeReadingsPerMonth: 1,
  },
];

export function getSubscriptionPlanById(id: string): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id);
}

// Focus areas for daily readings
export const FOCUS_AREAS = [
  { value: 'general', labelEn: 'General Guidance', labelEs: 'Guía General' },
  { value: 'love', labelEn: 'Love & Relationships', labelEs: 'Amor y Relaciones' },
  { value: 'career', labelEn: 'Career & Finances', labelEs: 'Carrera y Finanzas' },
  { value: 'spirituality', labelEn: 'Spirituality & Growth', labelEs: 'Espiritualidad y Crecimiento' },
  { value: 'health', labelEn: 'Health & Wellness', labelEs: 'Salud y Bienestar' },
] as const;

export type FocusArea = typeof FOCUS_AREAS[number]['value'];

// Email delivery times
export const EMAIL_TIMES = [
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '22:00', label: '10:00 PM' },
] as const;
