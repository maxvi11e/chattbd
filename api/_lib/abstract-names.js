const ABSTRACT_NAMES = [
  { name: "ALEX", expansion: "Adaptive Learning Engine for eXploration" },
  { name: "CASEY", expansion: "Cognitive AI System for Exploration & Yield" },
  { name: "JORDAN", expansion: "Just-in-time Operational Reasoning, Dialogue & Neural model" },
  { name: "TAYLOR", expansion: "Transformative AI Yielding Logic, Operations & Reasoning" },
  { name: "MORGAN", expansion: "Model for Operational Reasoning, Generation & Adaptive Navigation" },
  { name: "CAMERON", expansion: "Cognitive AI Model for Enhanced Reasoning, Operations & Navigation" },
  { name: "RYAN", expansion: "Reasoning Yielding Adaptive Neural-network" },
  { name: "SAM", expansion: "System for Adaptive Modeling" },
  { name: "JESS", expansion: "Judicious Engine for Synthesis & Simulation" },
  { name: "NOAH", expansion: "Neural Operations for AI & Harmony" },
  { name: "ETHAN", expansion: "Enhanced Transformer for Human-Aligned Navigation" },
  { name: "LOGAN", expansion: "Learning Oriented Generative AI for Navigation" },
  { name: "EMMA", expansion: "Engine for Modeling, Memory & Assistance" },
  { name: "OLIVIA", expansion: "Optimized Learning Intelligence for Versatile Interactive AI" },
  { name: "AVA", expansion: "Adaptive Virtual Assistant" },
  { name: "SOPHIA", expansion: "System for Operational Processing, Human Interaction & Analysis" },
  { name: "ISABELLE", expansion: "Intelligent System for Analysis, Benchmarking, Exploration, Learning & Logical Evaluation" },
  { name: "MIA", expansion: "Model for Intelligent Assistance" },
  { name: "CHARLIE", expansion: "Cognitive Helper for Adaptive Reasoning, Learning & Intelligent Exploration" },
  { name: "HARPER", expansion: "Human-Aligned Reasoning Platform for Exploration & Retrieval" },
  { name: "QUINN", expansion: "Quantitative Understanding & Intelligent Neural Network" },
  { name: "ROWAN", expansion: "Reasoning Oriented Workflow for AI Navigation" },
  { name: "SKYLER", expansion: "System for Knowledge, Yield, Learning & Enhanced Reasoning" },
  { name: "PEYTON", expansion: "Predictive Engine Yielding Thoughtful Operations & Navigation" },
  { name: "REESE", expansion: "Reasoning Engine for Exploration, Synthesis & Evaluation" },
  { name: "SASHA", expansion: "System for Adaptive Synthesis & Human Assistance" },
  { name: "BLAKE", expansion: "Bot for Learning, Analysis, Knowledge & Exploration" },
  { name: "JULES", expansion: "Judicious Understanding & Learning Engine System" },
  { name: "PHOENIX", expansion: "Predictive Hybrid Operations Engine for Neural Intelligence & eXploration" },
  { name: "DEVON", expansion: "Dynamic Engine for Versatile Operations & Navigation" },
  { name: "KAI", expansion: "Knowledgeable AI" },
  { name: "DREW", expansion: "Dynamic Reasoning Engine for Workflows" },
  { name: "RILEY", expansion: "Reasoning Intelligence for Learning & Exploration in Yield" },
  { name: "SPENCER", expansion: "System for Processing, Exploration, Navigation, Computation & Enhanced Reasoning" },
  { name: "TAY", expansion: "Transformer for Adaptive Yield" },
  { name: "ASH", expansion: "Adaptive System for Help" },
  { name: "ROWIE", expansion: "Reasoning Oriented Workflow for Intelligent Exploration" },
  { name: "ELLIS", expansion: "Engine for Learning, Logic, Intelligence & Synthesis" },
  { name: "GREY", expansion: "Generative Reasoning Engine for Yield" },
  { name: "KENDALL", expansion: "Knowledge Engine for Neural Dialogue, Assistance, Learning & Logic" },
  { name: "BAY", expansion: "Bot for Adaptive Yield" },
  { name: "FINLEY", expansion: "Framework for Intelligent Navigation, Learning & Enhanced Yield" },
  { name: "JAMIE", expansion: "Judicious AI for Modeling, Interaction & Exploration" },
  { name: "ARLO", expansion: "AI for Reasoning, Learning & Operations" },
  { name: "OAKLEY", expansion: "Operational AI for Knowledge, Learning & Enhanced Yield" },
  { name: "SAGE", expansion: "System for Adaptive Generative Exploration" },
  { name: "LESLIE", expansion: "Learning Engine for Synthesis, Logic, Intelligence & Exploration" },
  { name: "TERRAN", expansion: "Transformer Engine for Reasoning, Retrieval & Adaptive Navigation" },
  { name: "INDIGO", expansion: "Intelligent Neural Dialogue & Insight Generation Operator" }
];

const sanitizeRandom = (rng) => (typeof rng === 'function' ? rng : Math.random);

export function pickAbstractName(rng) {
  const rand = sanitizeRandom(rng);
  const entry = ABSTRACT_NAMES[Math.floor(rand() * ABSTRACT_NAMES.length)] || ABSTRACT_NAMES[0];
  return {
    ...entry,
    label: `${entry.name}: ${entry.expansion}`
  };
}

export const ABSTRACT_NAME_OPTIONS = ABSTRACT_NAMES;

export default pickAbstractName;
