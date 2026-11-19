// Playful, lightweight comedy quips, NPC banter, and random city events

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

export const CRASH_LINES = [
  'Bro forgot how to drive!',
  'Your driving license has left the chat.',
  'Even the traffic cone has better driving skills.',
  'That wall jumped right in front of you!',
  'Raju Mechanic is smiling at your bumper.',
  'Parking level: Chaotic Good.',
] as const;

export const STUNT_LAUNCH_LINES = [
  'Gravity filed a formal complaint!',
  'Physics called — it wants a refund!',
  'Is it a bird? Is it a plane? No, it is an Auto!',
  'Bollywood stunt director approves!',
] as const;

export const STUNT_LANDING_LINES = [
  'That landing was personal.',
  'Congratulations! You survived another bad decision.',
  '10/10 from the chaiwala judges!',
  'Suspension? Never heard of her.',
] as const;

export const WANTED_LINES = [
  'Police are not impressed.',
  'Inspector Chingum is typing...',
  'Sir, that was NOT a legal U-turn!',
  'Chingum says: "My name is Chingum, stop right there!"',
] as const;

export const WASTED_SUBTITLES = [
  'Congratulations! You survived another bad decision... almost.',
  'Chai Chowk doctors prescribed two hot samosas.',
  'That landing was personal.',
  'Your driving license has permanently left the chat.',
  'Even the street cow shook its head in disappointment.',
  'Respawning with fresh chai and zero regrets.',
] as const;

export const KO_NPC_LINES = [
  'Sent straight to cartoon orbit!',
  'Bro saw stars in 4K!',
  'Physics left the chat!',
  'Instant nap delivered!',
  'Certified Bollywood knockback!',
] as const;

export const NPC_BANTER_LINES = [
  '"Bhai, indicator kab use karoge?!"',
  '"Are you filming a stunt movie or just lost?"',
  '"Hide the samosas, Motu is in town!"',
  '"My dadi drives faster than that!"',
  '"Sir, this is a chai stall, not a racetrack!"',
  '"Nice outfit! Did you borrow it from a cartoon?"',
  '"Careful! That cow owns half this street."',
  '"Bro really thinks he is the main character."',
] as const;

export const HONK_REACTIONS = [
  '"Haan haan, ud ke jaaun kya?!"',
  '"Nice horn! Play a wedding song next!"',
  '"Relax bro, traffic is a lifestyle here!"',
  '"Beep beep! VIP coming through!"',
] as const;

export const COW_LINES = [
  'Sacred Cow is unbothered. Mooo!',
  'Cow says: "I was here before the road existed."',
  'Beep all you want — the cow has right of way!',
] as const;

export const EASTER_EGG_SECRETS = [
  'Secret #1: The Forbidden Golden Samosa of Chai Chowk!',
  'Secret #2: Patlu\'s Lost 200-IQ Lightbulb Trophy!',
  'Secret #3: Oggy\'s Legendary Golden Fly Swatter!',
  'Secret #4: Tun Tun Mausi\'s Ultra-Dense Laddu!',
  'Secret #5: Inspector Chingum\'s Unbreakable Coconut!',
] as const;

export const MISSION_PASS_QUIPS = [
  'Congratulations! You survived another bad decision.',
  'Legend of Furfuri Nagri! Free chai for life!',
  'Raju Mechanic sheds a tear of pride.',
  'Certified 5-star street chaos!',
] as const;

export interface RandomCityEventDef {
  id: 'samosa_rain' | 'stunt_fever' | 'cow_parade' | 'disco_chowk';
  title: string;
  subtitle: string;
  duration: number;
}

export const CITY_EVENTS: readonly RandomCityEventDef[] = [
  {
    id: 'samosa_rain',
    title: 'GOLDEN SAMOSA FEVER!',
    subtitle: '2x Cash on all street pickups for 18s!',
    duration: 18,
  },
  {
    id: 'stunt_fever',
    title: 'BOLLYWOOD STUNT HOUR!',
    subtitle: '2x Stunt Ramp bonuses across Furfuri Nagri!',
    duration: 20,
  },
  {
    id: 'cow_parade',
    title: 'VIP COW PARADE!',
    subtitle: 'Honk near street cows for +₹150 comedy tips!',
    duration: 18,
  },
  {
    id: 'disco_chowk',
    title: 'CHAI CHOWK STREET PARTY!',
    subtitle: 'Bonus +₹100 on every KO & barrel blast!',
    duration: 18,
  },
] as const;

export const randomCrashLine = () => pick(CRASH_LINES);
export const randomStuntLaunch = () => pick(STUNT_LAUNCH_LINES);
export const randomStuntLanding = () => pick(STUNT_LANDING_LINES);
export const randomWantedLine = () => pick(WANTED_LINES);
export const randomWastedSubtitle = () => pick(WASTED_SUBTITLES);
export const randomKoLine = () => pick(KO_NPC_LINES);
export const randomNpcBanter = () => pick(NPC_BANTER_LINES);
export const randomHonkReaction = () => pick(HONK_REACTIONS);
export const randomCowLine = () => pick(COW_LINES);
export const randomMissionQuip = () => pick(MISSION_PASS_QUIPS);
export const randomCityEvent = () => pick(CITY_EVENTS);
