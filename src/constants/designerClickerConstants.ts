export interface Designer {
  id: string;
  name: string;
  title: string;
  baseRate: number; // IP per second
  cost: number;
  clickRate?: number; // Click power multiplier per unit (e.g., 2 = doubles click power)
  bonusCondition?: () => number; // Returns bonus multiplier
  maxOwned?: number; // Maximum number of this designer that can be owned (undefined = unlimited)
}

export interface Level {
  id: number;
  name: string;
  description: string;
  milestone: number; // Inspiration Points needed
  theme: string;
  passiveBonus: number; // Percentage bonus
  image?: string;
}

export const LEVELS: Level[] = [
  {
    id: 1,
    name: 'Flyers',
    description: 'Bad clients ask for 8 versions.',
    milestone: 100,
    theme: 'flyer',
    passiveBonus: 0,
    image: '/levels/flyer.jpg',
  },
  // {
  //   id: 2,
  //   name: 'Websites',
  //   description: '99% hero image, 1% content.',
  //   milestone: 500,
  //   theme: 'website',
  //   passiveBonus: 10,
  //   image: '/levels/website.jpg',
  // },
  // {
  //   id: 3,
  //   name: 'Webtools / SaaS',
  //   description: 'Users never read the onboarding.',
  //   milestone: 2000,
  //   theme: 'webtool',
  //   passiveBonus: 20,
  //   image: '/levels/webtool.jpg',
  // },
  // {
  //   id: 4,
  //   name: 'Dresses',
  //   description: 'Pivot into couture for no reason.',
  //   milestone: 10000,
  //   theme: 'fashion',
  //   passiveBonus: 30,
  //   image: '/levels/dress.jpg',
  // },
  // {
  //   id: 5,
  //   name: 'Buildings (END)',
  //   description: 'Everything is concrete and too expensive.',
  //   milestone: 50000,
  //   theme: 'architecture',
  //   passiveBonus: 40,
  //   image: '/levels/building.jpg',
  // },
];

export const DESIGNERS: Designer[] = [
  {
    id: 'porsche',
    name: 'Ferdinand Porsche',
    title: 'Makes your engine faster.',
    baseRate: 0,
    cost: 100,
    clickRate: 2,
    maxOwned: 3,
    bonusCondition: () => 1.0,
  },
  {
    id: 'jobs',
    name: 'Steve Jobs',
    title: 'Reality Distortion Field',
    baseRate: 2,
    cost: 50,
    bonusCondition: () => {
      // Check if battery is under 20% (if available)
      if ('getBattery' in navigator) {
        // @ts-ignore - getBattery is not in all browsers
        navigator.getBattery?.().then((battery: any) => {
          if (battery.level < 0.2) return 2.0; // +100% bonus
        });
      }
      return 1.0;
    },
  },
  {
    id: 'starck',
    name: 'Philippe Starck',
    title: 'Chairs Nobody Can Sit On',
    baseRate: 10,
    cost: 500,
    bonusCondition: () => {
      // Check if theme is monochrome gray (we'll implement this)
      const isMonochrome = document.body.classList.contains('monochrome-gray');
      return isMonochrome ? 1.5 : 1.0; // +50% bonus
    },
  },
  {
    id: 'chanel',
    name: 'Coco Chanel',
    title: 'Timeless Simplicity',
    baseRate: 15,
    cost: 5000,
    bonusCondition: () => 1.0, // No special condition, but generates Style on click
  },
  {
    id: 'eames',
    name: 'Ray Eames',
    title: 'Everyone loves these chairs.',
    baseRate: 0,
    cost: 1000,
    clickRate: 4,
    maxOwned: 2,
    bonusCondition: () => 1.0,
  },
];

export const PER_LEVEL_INCREASE = 2;

/**
 * Calculate the cost of purchasing a designer based on base cost and number owned
 * @param baseCost - The base cost of the designer
 * @param owned - The number of this designer already owned
 * @returns The cost to purchase one more of this designer
 */
export const getDesignerCost = (baseCost: number, owned: number): number => {
  return Math.floor(baseCost * Math.pow(1.15, owned));
};

/**
 * Calculate the IP/s (Inspiration Points per second) rate for a designer
 * @param designerId - The ID of the designer
 * @param baseRate - The base IP/s rate for this designer
 * @param owned - The number of this designer owned
 * @param batteryBonus - Battery bonus multiplier (for Steve Jobs)
 * @param isMonochrome - Whether monochrome theme is active (for Philippe Starck)
 * @returns The total IP/s rate for this designer
 */
export const getDesignerRate = (
  designerId: string,
  baseRate: number,
  owned: number,
  batteryBonus: number = 1.0,
  isMonochrome: boolean = false
): number => {
  let rate = baseRate * owned;
  
  // Apply bonuses
  if (designerId === 'jobs' && batteryBonus > 1.0) {
    rate *= batteryBonus;
  }
  if (designerId === 'starck' && isMonochrome) {
    rate *= 1.5;
  }
  
  return rate;
};

