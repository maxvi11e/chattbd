// /api/suggest-persona.js
// Generates persona suggestions from a local library (no external model calls).
// Expected POST JSON body: { archetypeCategory: string, sliders: { seriousPlayful, succinctChatty, rationalIntuitive, practicalImaginative } }
// Returns: { name: string, description: string, reasoning?: string }

const animalBuckets = {
  bucket1: [
    "Jellyfish",
    "Crocodile",
    "Alligator",
    "Komodo Dragon",
    "Tortoise",
    "Rhino",
    "Hippo",
    "Water Buffalo",
    "Yak",
    "Bison",
    "Moose",
    "Camel",
    "Wild Boar",
    "Lizard",
    "Iguana",
    "Swordfish",
    "Condor",
    "Vulture",
    "Polar Bear",
    "Grizzly Bear"
  ],
  bucket2: [
    "Panda",
    "Sloth",
    "Tiger",
    "Leopard",
    "Lion",
    "Cheetah",
    "Wolf",
    "Hyena",
    "Giraffe",
    "Okapi",
    "Zebra",
    "Horse",
    "Cow",
    "Goat",
    "Sheep",
    "Pig",
    "Hedgehog",
    "Owl",
    "Hawk",
    "Eagle"
  ],
  bucket3: [
    "Rabbit",
    "Guinea Pig",
    "Raccoon",
    "Fox",
    "Meerkat",
    "Prairie Dog",
    "Koala",
    "Kangaroo",
    "Wallaby",
    "Tapir",
    "Manatee",
    "Whale",
    "Beluga",
    "Octopus",
    "Squid",
    "Seal",
    "Sea Lion",
    "Walrus",
    "Cat",
    "Dog"
  ],
  bucket4: [
    "Ferret",
    "River Otter",
    "Sea Otter",
    "Parrot",
    "Cockatoo",
    "Macaw",
    "Penguin",
    "Orca",
    "Porpoise",
    "Red Panda",
    "Capuchin Monkey",
    "Spider Monkey",
    "Orangutan",
    "Gorilla",
    "Chimpanzee",
    "Bonobo",
    "Dolphin",
    "Macaw",
    "Parakeet",
    "Toucan"
  ]
};

const animalBucketMeta = {
  bucket1: {
    nameAdjectives: ["Stoic", "Steady", "Silent", "Ancient"],
    descriptors: ["grounded", "watchful", "patient"],
    fallback: "steady resolve"
  },
  bucket2: {
    nameAdjectives: ["Swift", "Vigorous", "Wild", "Earnest"],
    descriptors: ["confident", "balanced", "warm"],
    fallback: "warm focus"
  },
  bucket3: {
    nameAdjectives: ["Curious", "Bright", "Lively", "Friendly"],
    descriptors: ["curious", "sociable", "inventive"],
    fallback: "curious balance"
  },
  bucket4: {
    nameAdjectives: ["Electric", "Vivid", "Radiant", "Spark"],
    descriptors: ["energetic", "playful", "imaginative"],
    fallback: "playful energy"
  }
};

function randomItem(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return list[array[0] % list.length];
  }
  return list[Math.floor(Math.random() * list.length)];
}

function sliderScore(sliders) {
  return sliders.seriousPlayful + sliders.succinctChatty + sliders.rationalIntuitive + sliders.practicalImaginative;
}

function pickAnimalFromScore(score) {
  let bucketKey;
  if (score <= 100) bucketKey = 'bucket1';
  else if (score <= 200) bucketKey = 'bucket2';
  else if (score <= 300) bucketKey = 'bucket3';
  else bucketKey = 'bucket4';

  const animal = randomItem(animalBuckets[bucketKey]);
  return { animal, bucketKey };
}

function sliderPhrases(sliders) {
  const phrases = [];
  if (sliders.seriousPlayful >= 70) phrases.push('playful spark');
  else if (sliders.seriousPlayful <= 30) phrases.push('calm focus');

  if (sliders.succinctChatty >= 70) phrases.push('lively chatter');
  else if (sliders.succinctChatty <= 30) phrases.push('thoughtful pauses');

  if (sliders.rationalIntuitive >= 70) phrases.push('intuitive leaps');
  else if (sliders.rationalIntuitive <= 30) phrases.push('analytical clarity');

  if (sliders.practicalImaginative >= 70) phrases.push('imaginative ideas');
  else if (sliders.practicalImaginative <= 30) phrases.push('practical instincts');

  return phrases;
}

function joinPhrases(list, fallback) {
  if (!list || list.length === 0) return fallback;
  if (list.length === 1) return list[0];
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;
}

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  try {
    const body = await req.json();
    const { archetypeCategory, sliders = {} } = body || {};
    console.log('[suggest-persona] incoming', {
      archetypeCategory,
      sliders,
      timestamp: new Date().toISOString()
    });
    if (!archetypeCategory) {
      return new Response(JSON.stringify({ error: 'Missing archetypeCategory' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const clamp = (v) => Math.min(100, Math.max(0, Number.isFinite(+v) ? +v : 50));
    const s = {
      seriousPlayful: clamp(sliders.seriousPlayful),
      succinctChatty: clamp(sliders.succinctChatty ?? sliders.succinctTalkative),
      rationalIntuitive: clamp(sliders.rationalIntuitive),
      practicalImaginative: clamp(sliders.practicalImaginative)
    };

    const flavor = [];
    if (s.seriousPlayful >= 65) flavor.push('highly playful'); else if (s.seriousPlayful <= 35) flavor.push('reserved');
    if (s.succinctChatty >= 65) flavor.push('very talkative'); else if (s.succinctChatty <= 35) flavor.push('succinct');
    if (s.rationalIntuitive >= 65) flavor.push('intuitive'); else if (s.rationalIntuitive <= 35) flavor.push('analytical');
    if (s.practicalImaginative >= 65) flavor.push('imaginative'); else if (s.practicalImaginative <= 35) flavor.push('practical');

    const normalizedCategory = `${archetypeCategory}`.trim().toLowerCase();
    if (normalizedCategory !== 'animal') {
      const placeholder = {
        name: 'Concept Coming Soon',
        description: `Persona library for ${archetypeCategory} is not configured yet.`,
        reasoning: 'Library pending configuration.',
        animalType: null,
        sliders: s,
        archetypeCategory,
        flavor
      };
      return new Response(JSON.stringify(placeholder), { headers: { 'Content-Type': 'application/json' } });
    }

    const totalScore = sliderScore(s);
    const { animal, bucketKey } = pickAnimalFromScore(totalScore);
    if (!animal) {
      return new Response(JSON.stringify({ error: 'No animals available for selection.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    const meta = animalBucketMeta[bucketKey] ?? animalBucketMeta.bucket3;
    const nameAdj = randomItem(meta.nameAdjectives) || 'Curious';
    const name = `${nameAdj} ${animal}`.slice(0, 60);

    const phrases = sliderPhrases(s);
    const descriptor = randomItem(meta.descriptors) || 'balanced';
    const descriptionTail = joinPhrases(phrases, meta.fallback);
    const description = `A ${descriptor} ${animal.toLowerCase()} with ${descriptionTail}.`.slice(0, 200);

    const reasoning = `Score ${totalScore} → ${bucketKey}, selected ${animal}.`;

    return new Response(JSON.stringify({
      name,
      description,
      animalType: animal,
      reasoning,
      sliders: s,
      archetypeCategory,
      flavor
    }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Unexpected error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
