export interface CreditPackage {
  id: string;
  credits: number;
  price: number; // cents USD
  priceDisplay: string;
  popular: boolean;
  description: string;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: "pack_5",
    credits: 5,
    price: 199,
    priceDisplay: "$1.99",
    popular: false,
    description: "2-5 lecturas",
  },
  {
    id: "pack_15",
    credits: 15,
    price: 499,
    priceDisplay: "$4.99",
    popular: true,
    description: "5-15 lecturas",
  },
  {
    id: "pack_30",
    credits: 30,
    price: 899,
    priceDisplay: "$8.99",
    popular: false,
    description: "10-30 lecturas",
  },
];

export function getPackageById(id: string): CreditPackage | undefined {
  return CREDIT_PACKAGES.find((pkg) => pkg.id === id);
}
