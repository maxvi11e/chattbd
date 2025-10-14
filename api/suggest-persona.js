// /api/suggest-persona.js
// Generates persona suggestions from a local library (no external model calls).
// Expected POST JSON body: { archetypeCategory: string, sliders: { seriousPlayful, succinctChatty, rationalIntuitive, practicalImaginative } }
// Returns: { name: string, description: string, reasoning?: string }

const animalBuckets = {
  bucket1: [
    "Jellyfish", "Crocodile", "Alligator", "Tortoise", "Rhino", "Hippo", "Water Buffalo", 
    "Yak", "Bison", "Moose", "Camel", "Lizard", "Iguana", "Sea Turtle", "Panda", "Sloth", 
    "Tiger", "Leopard", "Lion", "Cheetah", "Polar Bear", "Grizzly Bear"
  ],
  bucket2: [
    "Panda", "Sloth", "Tiger", "Leopard", "Lion", "Cheetah", "Wolf", "Giraffe", "Zebra", 
    "Horse", "Cow", "Goat", "Sheep", "Hedgehog", "Owl", "Hawk", "Eagle", "Rabbit",
    "Fox", "Meerkat", "Koala", "Kangaroo", "Wallaby", "Manatee", "Blue Whale", "Beluga" 
  ],
  bucket3: [
    "Octopus", "Seal", "Sea Lion", "Walrus", "Cat", "Dog",    
    "Ferret", "River Otter", "Sea Otter", "Penguin", "Orca", "Porpoise", 
    "Red Panda", "Monkey", "Orangutan", "Gorilla", "Chimpanzee", "Bonobo", "Dolphin", 
    "Raccoon", "Panda"
  ]
};

// Removed animalBucketMeta: animal names should be raw without adjective augmentation.

const humanArchetypeBuckets = {
  bucket1: [
    "Monk", "Zen Master", "Engineer", "Scientist", "Accountant", "Lawyer", 
    "Farmer", "Surgeon", "Analytical Philosopher", "Stoic Thinker", 
    "Mathematician", "Historian", "Logistician", "Professor", "Doctor", "Therapist", "Psychologist", 
    "Architect", "Strategist", "Diplomat", "Coach", "Politician", "Priest", "Software Developer"
  ],
  bucket2: [ 
    "Humanitarian", "Ethical Philosopher", "Counselor", "Inventor", "Activist", "Explorer", "Journalist",
    "Teacher", "Writer", "Poet", "Painter", "Chef", "Traveler", "Mentor", 
    "Neighbor", "Friend", "Athlete", "Optimist", "Romantic", 
    "Dreamer", "Comedian", "Visionary", 
  ],
  bucket3: [
    "Eternal Optimist", "Spiritual Seeker", "Mystic", "Revolutionary", 
    "Inventive Hacker", "Startup Founder", "Existential Philosopher", "Psychonaut", "Futurist", 
    "Creative Genius", "Rebel", "Idealist", "Story Weaver", 
    "Dream Architect", "Storyteller", "Music Producer", "Jazz Artist", "Rapper", "Contemporary Artist"],
};

const humanBucketMeta = {
  bucket1: {
    nameAdjectives: ["Stoic", "Steady", "Grounded", "Resolute"],
    descriptors: ["disciplined", "pragmatic", "composed"],
    fallback: "stoic poise"
  },
  bucket2: {
    nameAdjectives: ["Noble", "Earnest", "Trusted", "Guiding"],
    descriptors: ["respected", "competent", "charismatic"],
    fallback: "steady leadership"
  },
  bucket3: {
    nameAdjectives: ["Whimsical", "Visionary", "Radiant", "Playful"],
    descriptors: ["imaginative", "free-spirited", "visionary"],
    fallback: "boundless imagination"
  }
};

const archetypeBuckets = {
  bucket1: [ // 0–133: serious, rational, practical
    "Service Droid",
    "Autonomous Factory Robot",
    "Battle Mech",
    "Space Marine",
    "Ice Dragon",
    "Human Knight",
    "Dwarf",
    "Elf",
    "Dwarf Miner",
    "Ranger",
    "Hobbit",
    "Grey Alien",
    "Aquatic Alien",
    "Loch Ness Monster"
  ],
  bucket2: [ // 134–266: disciplined, heroic, competent
    "Ent",
    "Dryad",
    "Space Knight", // (appears again for thematic balance if desired)
    "Witch",
    "Starfighter Ace",
    "Desert Alien",
    "Rebel Fighter",
    "Elven King",
    "Space Bard",
    "Merchant Alien",
    "Time Traveler",
    "Yeti",
    "Aquatic Dragon",
  ],
  bucket3: [ // 267–400: curious, adventurous, imaginative
    "Space Colonist",
    "Technologist Wizard",
    "Luminous Energy Being",
    "Force-Wielding Sage",
    "Dragon",
    "Wizard",
    "Celestial Architect",
    "Illusionist",
    "Space Mystic",
    "Fairy",
    "Sprite",
    "Phoenix",
    "Griffin",
    "Druid",
  ]
};


// Removed sciFiBucketMeta per requirement: sci-fi / fantasy archetype names should be raw archetype strings without adjective/descriptors augmentation.

const personaLibraries = {
  'animal': {
    typeLabel: 'Animal type',
    buckets: animalBuckets,
    meta: null,
    descriptionTemplate: ({ type }) => `${type}`
  },
  'human': {
    typeLabel: 'Archetype type',
    buckets: humanArchetypeBuckets,
    meta: humanBucketMeta,
    descriptionTemplate: ({ descriptor, type, tail }) => `A ${descriptor} ${type.toLowerCase()} with ${tail}.`
  },
  'sci-fi / fantasy': {
    typeLabel: 'Character type',
    buckets: archetypeBuckets,
    meta: null, // meta intentionally null (no adjective/descriptor augmentation)
    // Description for sci-fi / fantasy kept minimal; will be overridden downstream.
    descriptionTemplate: ({ type }) => `${type}`
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

function pickTypeFromScore(score, buckets) {
  let bucketKey;
  if (score <= 133) bucketKey = 'bucket1';
  else if (score <= 266) bucketKey = 'bucket2';
  else bucketKey = 'bucket3';

  const bucket = buckets[bucketKey] || [];
  return { type: randomItem(bucket), bucketKey };
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
    const { archetypeCategory, sliders = {}, randomArchetype, forceCategory } = body || {};
    console.log('[suggest-persona] incoming', {
      archetypeCategory,
      randomArchetype,
      forceCategory,
      sliders,
      timestamp: new Date().toISOString()
    });
    if (randomArchetype) {
      let categoryKeys = Object.keys(personaLibraries);
      if (!categoryKeys.length) {
        return new Response(
          JSON.stringify({ error: 'No persona libraries configured.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      let normalizedCategory;
      
      // If forceCategory is provided, use that specific category
      if (forceCategory) {
        const forcedKey = categoryKeys.find(key => key.toLowerCase() === forceCategory.toLowerCase());
        if (!forcedKey) {
          return new Response(
            JSON.stringify({ error: `Invalid category: ${forceCategory}` }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
        normalizedCategory = forcedKey;
      } else {
        // Otherwise pick randomly from all categories
        normalizedCategory = randomItem(categoryKeys);
      }

      const library = personaLibraries[normalizedCategory];
      const bucketKeys = Object.keys(library?.buckets || {}).filter(Boolean);
      const bucketKey = randomItem(bucketKeys);
      const bucket = (library?.buckets?.[bucketKey] || []).filter(Boolean);

      if (!bucket.length || !bucketKey) {
        return new Response(
          JSON.stringify({ error: 'No entries available for random selection.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const type = randomItem(bucket);
      if (!type) {
        return new Response(
          JSON.stringify({ error: 'Failed to pick random archetype.' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const isSciFi = normalizedCategory === 'sci-fi / fantasy';
      const isAnimal = normalizedCategory === 'animal';
      const meta = (!isSciFi && !isAnimal && library.meta && library.meta[bucketKey]) ? library.meta[bucketKey] : {};

      let name;
      if (isSciFi || isAnimal) {
        name = type.slice(0, 60);
      } else {
        const nameAdj = randomItem(meta?.nameAdjectives) || 'Curious';
        name = `${nameAdj} ${type}`.slice(0, 60);
      }

      const responsePayload = {
        name,
        description: null,
        personaType: type,
        personaTypeLabel: library?.typeLabel || 'Persona type',
        reasoning: `Random selection from ${normalizedCategory} (${bucketKey}).`,
        sliders: null,
        archetypeCategory: normalizedCategory,
        flavor: []
      };

      return new Response(JSON.stringify(responsePayload), { headers: { 'Content-Type': 'application/json' } });
    }
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
    const library = personaLibraries[normalizedCategory];
    if (!library) {
      const placeholder = {
        name: 'Concept Coming Soon',
        description: `Persona library for ${archetypeCategory} is not configured yet.`,
        reasoning: 'Library pending configuration.',
        personaType: null,
        personaTypeLabel: 'Persona type',
        sliders: s,
        archetypeCategory,
        flavor
      };
      return new Response(JSON.stringify(placeholder), { headers: { 'Content-Type': 'application/json' } });
    }

    const totalScore = sliderScore(s);
    const { type, bucketKey } = pickTypeFromScore(totalScore, library.buckets);
    if (!type) {
      return new Response(JSON.stringify({ error: 'No entries available for selection.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

  const isSciFi = normalizedCategory === 'sci-fi / fantasy';
  const isAnimal = normalizedCategory === 'animal';
  const meta = (!isSciFi && !isAnimal && library.meta && library.meta[bucketKey]) ? library.meta[bucketKey] : {};
  let name;
    // Unified requirement: suggestion description should be null for all archetypes.
    if (isSciFi || isAnimal) {
      name = type.slice(0, 60);
    } else {
      const nameAdj = randomItem(meta.nameAdjectives) || 'Curious';
      name = `${nameAdj} ${type}`.slice(0, 60);
    }
  const description = null;

    const reasoning = `Score ${totalScore} → ${bucketKey}, selected ${type}.`;

    const responsePayload = {
      name,
  description, // intentionally null per requirement
      personaType: type,
      personaTypeLabel: library.typeLabel,
      reasoning,
      sliders: s,
      archetypeCategory,
      flavor
    };

    return new Response(JSON.stringify(responsePayload), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Unexpected error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
