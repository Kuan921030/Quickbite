export const calculateDistanceInMeters = (
  coordsStr: string,
  userCoords?: { lat: number; lng: number } | null
): number => {
  if (!coordsStr) return 450;
  const parts = coordsStr.split(',');
  if (parts.length !== 2) return 450;
  const lat1 = parseFloat(parts[0].trim());
  const lon1 = parseFloat(parts[1].trim());
  if (isNaN(lat1) || isNaN(lon1)) return 450;

  // Baseline: NTU Little Bell / Admin Building Area if user GPS is not available
  const lat2 = userCoords?.lat ?? 25.0174;
  const lon2 = userCoords?.lng ?? 121.5363;

  const R = 6371e3; // meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

export const getFriendlyDistanceText = (dist: number): string => {
  if (dist <= 220) {
    return '🚶 3 分鐘內';
  } else if (dist <= 600) {
    return '🚶 附近快速可達';
  } else {
    return '🚶 稍微遠一點';
  }
};

export const matchCuisine = (rawGenre: string, selCuisine: string): boolean => {
  if (selCuisine === '全部') return true;
  const rawG = (rawGenre || '').toLowerCase();
  if (selCuisine === '美式') {
    return ['steak', 'fastfood', 'american'].includes(rawG);
  }
  if (selCuisine === '義式') {
    return ['italian'].includes(rawG);
  }
  if (selCuisine === '中式') {
    return ['noodles', 'noodle', 'rice', 'hotpot', 'chinese', 'hongkong'].includes(rawG);
  }
  if (selCuisine === '日式') {
    return ['ramen', 'japanese', 'japenese'].includes(rawG);
  }
  if (selCuisine === '法式') {
    return ['french'].includes(rawG);
  }
  if (selCuisine === '韓式') {
    return ['korean'].includes(rawG);
  }
  if (selCuisine === '東南亞') {
    return ['southeastasian'].includes(rawG);
  }
  if (selCuisine === '其他') {
    const definedCuisines = [
      'steak',
      'fastfood',
      'american',
      'italian',
      'noodles',
      'noodle',
      'rice',
      'hotpot',
      'chinese',
      'hongkong',
      'ramen',
      'japanese',
      'japenese',
      'french',
      'korean',
      'southeastasian',
    ];
    return (
      ['bento', 'dessert', 'buffet', 'cafe'].includes(rawG) ||
      !definedCuisines.includes(rawG)
    );
  }
  return false;
};

export const getBuddyQuote = (
  restaurantName: string,
  type: 'fast' | 'safe' | 'new'
): string => {
  const quotes: Record<string, Record<'fast' | 'safe' | 'new', string>> = {
    '孫東寶牛排': {
      fast: '這間現烤現上，絕對能在有限時間裡塞爆你的高蛋白渴望！',
      safe: '今天累爆了吧？來切客香噴噴的鐵板牛排，濃郁醬汁超治癒。',
      new: '今天胃口特別好？牛排跟爆漿麵包熱氣騰騰，最邪惡也最爽快！',
    },
    'Este día 古巴三明治': {
      fast: '起司熱壓一拿就走！邊吃乾淨邊走回教室或辦公室，堪稱時間救星。',
      safe: '邪惡起司牽絲的熱度！香脆烤吐司，是絕對不會出錯的安全感。',
      new: '想來點不一樣的異國氣息嗎？道地香脆古巴風，一口咬下超級過癮。',
    },
    '大福利排骨大王': {
      fast: '排骨炸好隨時端上！大姨裝盤夾菜速度超越光速，3秒即拿！',
      safe: '台大人的老味道，排骨厚切多汁，今天不想動腦選這間就對了。',
      new: '吃膩麵食了？不如回歸懷舊極致炸排骨，最實惠滿足的真愛！',
    },
    "JJ's POKE & CAFE": {
      fast: '冷料即拌，公館地表最速出餐！清爽冷食完全不用等！',
      safe: '今天想吃得乾淨清爽？鮭魚大碗配新鮮時蔬，吃完下午上課完全不昏迷。',
      new: '今天要不吃點乾爽輕食？七彩魚介配美乃滋，一口清爽拯救沉悶腦袋。',
    },
    '藍家割包': {
      fast: '割包配四神湯一秒到嘴！免排太久，即時溫飽的完美方案。',
      safe: '花生粉爌肉手工手作最經典，半肥半瘦絕妙平衡，一頓吃出老靈魂。',
      new: '今天午餐想偷吃點不一樣的？割包加個四神湯，午後工作動力全開！',
    },
    'SUKIYA': {
      fast: '點單完 30 秒飛速端到面前！出餐速度界跨越維度的神話！',
      safe: '起司牛肉蓋飯，鹹香溫潤，你最忠實放心的午餐港灣。',
      new: '不想花大錢又想吃肉？超澎湃平民牛丼，熱呼呼的省心救星。',
    },
    '道樂製麵所': {
      fast: '雖然可能要稍微等一下，但濃醇豚骨高湯 5 分鐘出麵，速度驚人。',
      safe: '今天空氣冷清清，最適合吃熱騰騰的日式豚骨湯，暖胃又療癒！',
      new: '濃厚沾麵來一發！濃黑蒜香在嘴裡爆開，解壓抗疲勞第一名！',
    },
    '池先生': {
      fast: '椰香炒麵爆炒起鍋！南洋辛辣刺激香氣，幾分極速出餐。',
      safe: '招牌烤雞椰漿飯，外酥內嫩的香料炸雞，每一口都是快樂泉源。',
      new: '舌尖想要一點南洋狂熱？濃郁叻沙跟特製辣醬，吃完像度假一樣滿足。',
    },
    '壹之穴沾麵專門店': {
      fast: '沾汁濃料早已熬好，只需等麵條起鍋，厚實飽足最利索。',
      safe: '極濃郁柴魚魚介沾麵無懈可擊，麵條紮實有勁，重口味者的狂歡。',
      new: '叉燒厚片與超大厚切海苔，高濃度日式沾汁，讓你一口氣滿血復活！',
    },
  };

  const restaurantQuotes = quotes[restaurantName];
  if (restaurantQuotes) {
    return restaurantQuotes[type];
  }

  if (type === 'fast')
    return '你現在特別趕時間？這家出餐最穩、最少等待，塞進你緊湊的時間表！';
  if (type === 'safe')
    return '今天想吃點暖烘烘或穩健不踩雷的嗎？選這間，絕對療癒你的午餐時光。';
  return '想換換腦子吃點與平時截然不同的驚喜嗎？今天來吃這間，出發吧！';
};
