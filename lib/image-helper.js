// lib/image-helper.js - Smart gadget image resolver for backend
const GADGET_IMAGES = {
  // Laptops
  macbook: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&auto=format&fit=crop&q=80',
  laptop_gaming: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&auto=format&fit=crop&q=80',
  laptop_generic: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80',

  // Smartphones
  iphone_pro: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80',
  iphone_generic: 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800&auto=format&fit=crop&q=80',
  samsung_ultra: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&auto=format&fit=crop&q=80',
  samsung_generic: 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=800&auto=format&fit=crop&q=80',
  google_pixel: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
  xiaomi_phone: 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800&auto=format&fit=crop&q=80',
  phone_generic: 'https://images.unsplash.com/photo-1511707171634-5f897ff02560?w=800&auto=format&fit=crop&q=80',

  // Tablets
  ipad: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800&auto=format&fit=crop&q=80',
  tablet_generic: 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800&auto=format&fit=crop&q=80',

  // Wearables
  apple_watch: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800&auto=format&fit=crop&q=80',
  galaxy_watch: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80',
  smartwatch_generic: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&auto=format&fit=crop&q=80',

  // Audio
  airpods: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800&auto=format&fit=crop&q=80',
  tws_earbuds: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop&q=80',
  headphones: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80',
  speaker: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&auto=format&fit=crop&q=80',

  // Accessories
  charger_adapter: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',
  cable: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop&q=80',
  phone_case: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800&auto=format&fit=crop&q=80',
  screen_guard: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800&auto=format&fit=crop&q=80',
  powerbank: 'https://images.unsplash.com/photo-1609592807664-9d5108fef94c?w=800&auto=format&fit=crop&q=80',
  accessories_generic: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=800&auto=format&fit=crop&q=80',

  // Other
  devices_other: 'https://images.unsplash.com/photo-1468495244123-6c6c332eeece?w=800&auto=format&fit=crop&q=80'
};

const KEYWORD_RULES = [
  // Accessories specific
  { keywords: ['screen guard', 'tempered glass', 'hydrogel', 'antigores'], image: GADGET_IMAGES.screen_guard },
  { keywords: ['silicone case', 'phone case', 'casing', 'silicone', 'case'], image: GADGET_IMAGES.phone_case },
  { keywords: ['powerbank', 'power bank'], image: GADGET_IMAGES.powerbank },
  { keywords: ['kabel', 'cable', 'cord'], image: GADGET_IMAGES.cable },
  { keywords: ['charger', 'adapter', 'adaptor', 'magsafe', '20w'], image: GADGET_IMAGES.charger_adapter },

  // Laptops
  { keywords: ['macbook'], image: GADGET_IMAGES.macbook },
  { keywords: ['rog', 'tuf', 'legion', 'alienware', 'predator'], image: GADGET_IMAGES.laptop_gaming },
  { keywords: ['laptop', 'notebook', 'thinkpad', 'zenbook'], image: GADGET_IMAGES.laptop_generic },

  // Tablets
  { keywords: ['ipad'], image: GADGET_IMAGES.ipad },
  { keywords: ['tablet', 'tab s', 'matepad'], image: GADGET_IMAGES.tablet_generic },

  // Wearables
  { keywords: ['apple watch'], image: GADGET_IMAGES.apple_watch },
  { keywords: ['galaxy watch'], image: GADGET_IMAGES.galaxy_watch },
  { keywords: ['watch', 'smartwatch', 'band', 'garmin'], image: GADGET_IMAGES.smartwatch_generic },

  // Audio
  { keywords: ['airpods'], image: GADGET_IMAGES.airpods },
  { keywords: ['speaker', 'bluetooth speaker'], image: GADGET_IMAGES.speaker },
  { keywords: ['wf-1000', 'earbuds', 'tws', 'buds', 'in-ear'], image: GADGET_IMAGES.tws_earbuds },
  { keywords: ['headphone', 'headset', 'wh-1000'], image: GADGET_IMAGES.headphones },

  // Smartphones
  { keywords: ['iphone 15 pro', 'iphone 16 pro', 'iphone 14 pro', '15 pro'], image: GADGET_IMAGES.iphone_pro },
  { keywords: ['iphone'], image: GADGET_IMAGES.iphone_generic },
  { keywords: ['s24 ultra', 's23 ultra', 's25 ultra'], image: GADGET_IMAGES.samsung_ultra },
  { keywords: ['s24+', 's24 plus', 's23', 'galaxy s', 'galaxy'], image: GADGET_IMAGES.samsung_generic },
  { keywords: ['pixel'], image: GADGET_IMAGES.google_pixel },
  { keywords: ['xiaomi', 'redmi', 'poco'], image: GADGET_IMAGES.xiaomi_phone },
  { keywords: ['phone', 'hp', 'smartphone'], image: GADGET_IMAGES.phone_generic }
];

const CATEGORY_FALLBACKS = {
  accessories: GADGET_IMAGES.accessories_generic,
  audio: GADGET_IMAGES.headphones,
  wearables: GADGET_IMAGES.smartwatch_generic,
  tablets: GADGET_IMAGES.tablet_generic,
  laptops: GADGET_IMAGES.laptop_generic,
  smartphones: GADGET_IMAGES.phone_generic
};

function resolveGadgetImage(name = '', brand = '', category = '') {
  const text = `${name} ${brand}`.toLowerCase();
  const cat = (category || '').toLowerCase();

  for (const rule of KEYWORD_RULES) {
    if (rule.keywords.some(k => text.includes(k))) {
      return rule.image;
    }
  }

  return CATEGORY_FALLBACKS[cat] || GADGET_IMAGES.devices_other;
}

module.exports = {
  GADGET_IMAGES,
  resolveGadgetImage
};
