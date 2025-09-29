const VOCAB = {
  low: [
    'Core','Node','Stable','Grid','Vector','Circuit','Assistant','Dataset','Token','Dialogue','Workflow',
    'Centered','Harmonic','Contained','Intermediate','Median','Echo','Loop','Weave','Nexus','Classifier',
    'Feature','Label','Batch','Epoch','Logging','Baseline','Corpus','Category','Pipeline','Session'
  ],
  mid: [
    'Balanced','Nexus','Matrix','Shell','Layer','System','Model','Interface','Service','Endpoint',
    'Pattern','Metric','Score','Benchmark','Evaluation','Precision','Recall','Throughput','Scaling',
    'Container','Docker','API','Monitoring','Dashboard','Guardrails','Policy','Ontology','Cluster','Taxonomy'
  ],
  high: [
    'Adaptive','Emergent','Evolving','Flux','Bloom','Prism','Swarm','Cluster','Quantum','Neural','Transformer',
    'Array','Luma','Flare','Axiom','Drift','Obsidian','Stillwave','Resonance','Catalyst','Luminal',
    'Momentum','Continuum','Radiant','Aether','Aurora','Ascend','Beacon','Parallax','Vectorial','Celestia',
    'Alignment','Preference','Reinforcement','Feedback','Prototype','Deployment','Exploration','Conduit','Fractal','Horizon'
  ]
};

const CONNECTORS = ['for','of','and','with','in','towards','through'];

const DEFAULT_NAMES = [
  'JASON','AMY','BRIAN','KELLY','ERIC','MEGAN','LUKE','DAN','NICK','CHRIS','TONY','LAURA',
  'MATT','KAREN','STEVE','DAVID','RACHEL','SEAN','MARK','KATE','JEN','ALAN','PETER','SARAH',
  'ALEX','CASEY','JORDAN','TAYLOR','MORGAN','CAMERON','RYAN','SAM','JESS','NOAH','ETHAN','LOGAN',
  'EMMA','OLIVIA','AVA','SOPHIA','ISABELLA','MIA','CHARLOTTE','AMELIA','HARPER','ELLA','GRACE','HANNAH'
];

const BUCKET_KEYS = ['sp','ri','sc','cl'];

const sanitizeRandom = (rng) => (typeof rng === 'function' ? rng : Math.random);

const pickFrom = (arr, rngFn) => {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const idx = Math.floor(rngFn() * arr.length);
  return arr[Math.max(0, Math.min(arr.length - 1, idx))];
};

function wordForLetter(letter, buckets, rngFn) {
  const bucketKey = pickFrom(BUCKET_KEYS, rngFn) || 'sp';
  const level = buckets?.[bucketKey] || 'mid';
  const pool = VOCAB[level] || VOCAB.mid;
  const match = pool.find((w) => w[0].toUpperCase() === letter);
  return match || pickFrom(pool, rngFn) || letter;
}

export function generateBackcronym(buckets, rng) {
  const rngFn = sanitizeRandom(rng);
  const acronym = pickFrom(DEFAULT_NAMES, rngFn) || 'AEAEA';
  const words = acronym.split('').map((letter) => wordForLetter(letter, buckets, rngFn));
  const expanded = words
    .map((word, idx) => (idx < words.length - 1 ? `${word} ${pickFrom(CONNECTORS, rngFn)}` : word))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  const label = `${acronym}: ${expanded}`;

  return {
    acronym,
    words,
    phrase: expanded,
    label
  };
}

export function bucketsFromSliders(sliders = {}, normalizer = (n) => n) {
  const norm = (value) => {
    const n = Number(normalizer(value));
    if (!Number.isFinite(n)) return 50;
    return Math.min(100, Math.max(0, n));
  };
  const bucket = (n) => (n <= 30 ? 'low' : n >= 70 ? 'high' : 'mid');
  const values = {
    sp: norm(sliders.seriousPlayful),
    sc: norm(sliders.succinctChatty),
    ri: norm(sliders.rationalIntuitive),
    cl: norm(sliders.practicalImaginative)
  };
  return {
    buckets: {
      sp: bucket(values.sp),
      sc: bucket(values.sc),
      ri: bucket(values.ri),
      cl: bucket(values.cl)
    },
    normalized: values
  };
}

export default generateBackcronym;
