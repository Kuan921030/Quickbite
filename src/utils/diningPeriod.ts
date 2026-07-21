export type DiningPeriod =
  | 'lunch_peak'
  | 'afternoon_off_peak'
  | 'dinner_peak'
  | 'general_off_peak';

export interface DiningPeriodConfig {
  title: string;
  description: string;
  tone: 'peak' | 'off_peak' | 'neutral';
  icon: 'clock' | 'coffee' | 'utensils' | 'compass';
  promotion?: {
    enabled: boolean;
    label: string;
  };
}

export function getDiningPeriod(date: Date = new Date()): DiningPeriod {
  const hours = date.getHours();
  if (hours >= 12 && hours < 14) {
    return 'lunch_peak';
  } else if (hours >= 14 && hours < 17) {
    return 'afternoon_off_peak';
  } else if (hours >= 17 && hours < 19) {
    return 'dinner_peak';
  } else {
    return 'general_off_peak';
  }
}

export const DINING_PERIOD_CONFIGS: Record<DiningPeriod, DiningPeriodConfig> = {
  lunch_peak: {
    title: '午餐尖峰時段',
    description: '現在通常是用餐熱門時段，先決定好再出發，可以少一點現場猶豫。',
    tone: 'peak',
    icon: 'utensils',
    promotion: {
      enabled: false,
      label: '離峰限定折扣'
    }
  },
  afternoon_off_peak: {
    title: '午後離峰時段',
    description: '這個時段通常較悠閒，適合探索平常比較少嘗試的餐廳。',
    tone: 'off_peak',
    icon: 'coffee',
    promotion: {
      enabled: false,
      label: '午後限時驚喜折價券'
    }
  },
  dinner_peak: {
    title: '晚餐尖峰時段',
    description: '晚餐人潮通常會逐漸增加，現在先選好，可以更快決定下一站。',
    tone: 'peak',
    icon: 'clock',
    promotion: {
      enabled: false,
      label: '晚餐精選特惠活動'
    }
  },
  general_off_peak: {
    title: '一般離峰時段',
    description: '現在不是主要用餐尖峰，部分店家的營業狀態可能有所不同，出發前可先查看地圖資訊。',
    tone: 'neutral',
    icon: 'compass',
    promotion: {
      enabled: false,
      label: '深夜限定特惠'
    }
  },
};
