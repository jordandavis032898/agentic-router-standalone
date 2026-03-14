import { useState } from 'react'

// ─── Company Directory Data ───────────────────────────────────────────────────

export const COMPANIES = [
  // Popular
  { ticker: 'AAPL',  name: 'Apple',               domain: 'apple.com',           desc: 'Makes iPhones, iPads, and Macs',         category: 'popular' },
  { ticker: 'GOOGL', name: 'Google',               domain: 'google.com',          desc: 'Runs the search engine and YouTube',      category: 'popular' },
  { ticker: 'AMZN',  name: 'Amazon',               domain: 'amazon.com',          desc: 'Online shopping and Alexa',               category: 'popular' },
  { ticker: 'TSLA',  name: 'Tesla',                domain: 'tesla.com',           desc: 'Electric cars and rockets guy',            category: 'popular' },
  { ticker: 'MSFT',  name: 'Microsoft',            domain: 'microsoft.com',       desc: 'Xbox, Windows, and Office',               category: 'popular' },
  { ticker: 'NFLX',  name: 'Netflix',              domain: 'netflix.com',         desc: 'Streaming movies and shows',              category: 'popular' },
  { ticker: 'NKE',   name: 'Nike',                 domain: 'nike.com',            desc: 'Sneakers and sportswear',                 category: 'popular' },
  { ticker: 'DIS',   name: 'Disney',               domain: 'disney.com',          desc: 'Theme parks, movies, and Disney+',        category: 'popular' },
  { ticker: 'NVDA',  name: 'Nvidia',               domain: 'nvidia.com',          desc: 'Makes chips that power AI',               category: 'popular' },
  { ticker: 'META',  name: 'Meta',                 domain: 'meta.com',            desc: 'Facebook, Instagram, and WhatsApp',       category: 'popular' },
  // Food & Drinks
  { ticker: 'MCD',   name: "McDonald's",           domain: 'mcdonalds.com',       desc: 'Burgers and fries everywhere',            category: 'food' },
  { ticker: 'SBUX',  name: 'Starbucks',            domain: 'starbucks.com',       desc: 'Coffee shops on every corner',            category: 'food' },
  { ticker: 'KO',    name: 'Coca-Cola',            domain: 'coca-cola.com',       desc: 'The soda company',                        category: 'food' },
  { ticker: 'PEP',   name: 'PepsiCo',              domain: 'pepsico.com',         desc: 'Pepsi, Doritos, and Gatorade',            category: 'food' },
  { ticker: 'CMG',   name: 'Chipotle',             domain: 'chipotle.com',        desc: 'Burritos and bowls',                      category: 'food' },
  // Gaming & Entertainment
  { ticker: 'RBLX',  name: 'Roblox',               domain: 'roblox.com',          desc: 'The game platform kids love',             category: 'gaming' },
  { ticker: 'EA',    name: 'Electronic Arts',       domain: 'ea.com',              desc: 'FIFA, Madden, and Sims',                  category: 'gaming' },
  { ticker: 'SPOT',  name: 'Spotify',               domain: 'spotify.com',         desc: 'Music streaming',                         category: 'gaming' },
  { ticker: 'WBD',   name: 'Warner Bros Discovery', domain: 'wbd.com',             desc: 'Harry Potter, DC Comics, HBO',            category: 'gaming' },
  { ticker: 'TTWO',  name: 'Take-Two',              domain: 'take2games.com',      desc: 'Grand Theft Auto and NBA 2K',             category: 'gaming' },
  // Shopping & Fashion
  { ticker: 'WMT',   name: 'Walmart',              domain: 'walmart.com',         desc: 'The biggest store in the world',          category: 'shopping' },
  { ticker: 'TGT',   name: 'Target',               domain: 'target.com',          desc: 'The red bullseye store',                  category: 'shopping' },
  { ticker: 'COST',  name: 'Costco',               domain: 'costco.com',          desc: 'Bulk shopping warehouse',                 category: 'shopping' },
  { ticker: 'LULU',  name: 'Lululemon',            domain: 'lululemon.com',       desc: 'Yoga pants and athleisure',               category: 'shopping' },
  { ticker: 'RL',    name: 'Ralph Lauren',          domain: 'ralphlauren.com',     desc: 'Polo shirts and preppy fashion',          category: 'shopping' },
  // Health
  { ticker: 'JNJ',   name: 'Johnson & Johnson',    domain: 'jnj.com',            desc: 'Band-Aids, baby shampoo, and medicine',   category: 'health' },
  { ticker: 'PFE',   name: 'Pfizer',               domain: 'pfizer.com',          desc: 'Made the COVID vaccine',                  category: 'health' },
  { ticker: 'UNH',   name: 'UnitedHealth',         domain: 'unitedhealthgroup.com', desc: 'Health insurance giant',                category: 'health' },
  // Money & Banks
  { ticker: 'JPM',   name: 'JPMorgan Chase',       domain: 'jpmorganchase.com',   desc: 'The biggest bank in America',             category: 'banks' },
  { ticker: 'V',     name: 'Visa',                 domain: 'visa.com',            desc: 'The card you swipe to pay',               category: 'banks' },
  { ticker: 'PYPL',  name: 'PayPal',               domain: 'paypal.com',          desc: 'Send money online',                       category: 'banks' },
  { ticker: 'GS',    name: 'Goldman Sachs',        domain: 'goldmansachs.com',    desc: 'Wall Street investment bank',             category: 'banks' },
  // Travel & Cars
  { ticker: 'UBER',  name: 'Uber',                 domain: 'uber.com',            desc: 'Ride-hailing and food delivery',          category: 'travel' },
  { ticker: 'ABNB',  name: 'Airbnb',               domain: 'airbnb.com',          desc: "Rent someone's house for vacation",       category: 'travel' },
  { ticker: 'F',     name: 'Ford',                 domain: 'ford.com',            desc: 'Trucks and cars since 1903',              category: 'travel' },
  { ticker: 'DAL',   name: 'Delta',                domain: 'delta.com',           desc: 'One of the biggest airlines',             category: 'travel' },
  // Energy
  { ticker: 'XOM',   name: 'ExxonMobil',           domain: 'exxonmobil.com',     desc: 'Oil and gas giant',                       category: 'energy' },
  { ticker: 'NEE',   name: 'NextEra Energy',       domain: 'nexteraenergy.com',   desc: 'Wind and solar power',                    category: 'energy' },
]

export const CATEGORIES = [
  { id: 'popular',  label: 'Popular',              emoji: '\u{1F31F}' },
  { id: 'food',     label: 'Food & Drinks',        emoji: '\u{1F354}' },
  { id: 'gaming',   label: 'Gaming & Entertainment', emoji: '\u{1F3AE}' },
  { id: 'shopping', label: 'Shopping & Fashion',    emoji: '\u{1F6CD}\uFE0F' },
  { id: 'health',   label: 'Health',               emoji: '\u{1F48A}' },
  { id: 'banks',    label: 'Money & Banks',         emoji: '\u{1F3E6}' },
  { id: 'travel',   label: 'Travel & Cars',         emoji: '\u2708\uFE0F' },
  { id: 'energy',   label: 'Energy',               emoji: '\u26A1' },
]

// ─── Logo Component with Fallback ─────────────────────────────────────────────

export function CompanyLogo({ domain, name, size = 48 }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: 'linear-gradient(135deg, #3b82f6, #10b981)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        color: 'white',
        fontSize: size * 0.38,
        flexShrink: 0,
      }}>
        {name.charAt(0)}
      </div>
    )
  }

  return (
    <img
      src={`https://logo.clearbit.com/${domain}`}
      alt={name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{
        borderRadius: 12,
        background: 'white',
        objectFit: 'contain',
        flexShrink: 0,
      }}
    />
  )
}

// ─── Fuzzy Search ─────────────────────────────────────────────────────────────

export function fuzzyMatch(text, query) {
  const t = text.toLowerCase()
  const q = query.toLowerCase()
  if (t.includes(q)) return true
  let ti = 0
  for (let qi = 0; qi < q.length; qi++) {
    const found = t.indexOf(q[qi], ti)
    if (found === -1) return false
    ti = found + 1
  }
  return true
}
