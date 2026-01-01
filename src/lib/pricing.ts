export interface CreditPackage {
  id: string;
  credits: number;
  price: number; // centavos MXN
  priceDisplay: string;
  popular: boolean;
  description: string;
  descriptionEs: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "pack_5",
    credits: 5,
    price: 3900,
    priceDisplay: "$39 MXN",
    popular: false,
    description: "Up to 5 readings",
    descriptionEs: "Hasta 5 lecturas",
  },
  {
    id: "pack_15",
    credits: 15,
    price: 9900,
    priceDisplay: "$99 MXN",
    popular: true,
    description: "Up to 15 readings",
    descriptionEs: "Hasta 15 lecturas",
  },
  {
    id: "pack_50",
    credits: 50,
    price: 29900,
    priceDisplay: "$299 MXN",
    popular: false,
    description: "Up to 50 readings",
    descriptionEs: "Hasta 50 lecturas",
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
  price: number; // centavos MXN
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
    price: 7900,
    priceDisplay: '$79 MXN/mes',
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
  { value: '05:00', label: '5:00 AM' },
  { value: '06:00', label: '6:00 AM' },
  { value: '07:00', label: '7:00 AM' },
  { value: '08:00', label: '8:00 AM' },
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '16:00', label: '4:00 PM' },
  { value: '18:00', label: '6:00 PM' },
  { value: '20:00', label: '8:00 PM' },
  { value: '21:00', label: '9:00 PM' },
  { value: '22:00', label: '10:00 PM' },
] as const;
