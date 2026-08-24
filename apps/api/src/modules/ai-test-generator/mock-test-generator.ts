import { GenerateTestDto } from "./dto/generate-test.dto";

export interface GeneratedQuestion {
  type: "multiple_choice" | "fill_blank" | "true_false" | "short_answer" | "essay";
  text: string;
  options: string[];
  correctAnswer: string | null;
  marks: number;
  explanation: string | null;
  order: number;
}

export interface GeneratedTest {
  title: string;
  questions: GeneratedQuestion[];
  totalMarks: number;
  passMarks: number;
}

function pick<T>(options: T[]): T {
  return options[Math.floor(Math.random() * options.length)];
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const IRREGULAR_VERBS: [string, string][] = [
  ["go", "went"],
  ["see", "saw"],
  ["eat", "ate"],
  ["write", "wrote"],
  ["take", "took"],
  ["begin", "began"],
  ["speak", "spoke"],
  ["choose", "chose"],
];

/** How many marks a single question is worth, by level. */
function marksForLevel(level: string): number {
  if (level === "Advanced") return pick([2, 2, 3]);
  if (level === "Beginner") return 1;
  return pick([1, 1, 2]);
}

/** Splits questionCount across the requested (or default-weighted) question types, capping essay at 1. */
function planTypeCounts(questionCount: number, requestedTypes: string[] | undefined): string[] {
  const weights: Record<string, number> = requestedTypes?.length
    ? Object.fromEntries(requestedTypes.map((t) => [t, 1 / requestedTypes.length]))
    : { multiple_choice: 0.6, fill_blank: 0.2, true_false: 0.1, short_answer: 0.1 };

  const types = Object.keys(weights);
  const hasEssay = types.includes("essay");
  const nonEssayTypes = types.filter((t) => t !== "essay");
  const essayCount = hasEssay ? 1 : 0;
  const remaining = questionCount - essayCount;

  const counts: Record<string, number> = {};
  let allocated = 0;
  for (const t of nonEssayTypes) {
    const count = Math.round((weights[t] / nonEssayTypes.reduce((s, x) => s + weights[x], 0)) * remaining);
    counts[t] = count;
    allocated += count;
  }
  // Absorb rounding drift into the first (most heavily weighted) type.
  if (nonEssayTypes.length > 0) {
    counts[nonEssayTypes[0]] += remaining - allocated;
  }
  if (hasEssay) counts.essay = essayCount;

  const plan: string[] = [];
  for (const [type, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) plan.push(type);
  }
  return shuffle(plan);
}

function buildMultipleChoice(topic: string, subject: string, level: string, isUzbek: boolean, isGrammar: boolean): {
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
} {
  let templates: string[];
  if (isGrammar) {
    templates = isUzbek
      ? [`Quyidagilardan qaysi biri ${topic} bilan to'g'ri ishlatilgan?`, `${topic} mavzusida qaysi gap grammatik jihatdan to'g'ri?`]
      : [
          `Which sentence correctly uses ${topic}?`,
          `Identify the correct grammatical form related to ${topic}.`,
          `Which option correctly demonstrates ${topic} in a passive construction?`,
        ];
  } else if (subject === "Mathematics") {
    templates = isUzbek
      ? [`${topic} formulasini to'g'ri qo'llagan javobni tanlang.`, `${topic} bo'yicha masalani yeching. To'g'ri javob qaysi?`]
      : [`Which of the following correctly applies ${topic}?`, `Solve the problem related to ${topic}. Which answer is correct?`];
  } else {
    templates = isUzbek
      ? [`${topic} haqida quyidagilardan qaysi biri TO'G'RI?`, `${topic} bilan bog'liq to'g'ri variantni tanlang.`, `${topic} ning asosiy xususiyati nima?`]
      : [
          `Which of the following is TRUE about ${topic}?`,
          `Choose the correct option related to ${topic}.`,
          `Which example correctly demonstrates ${topic}?`,
          `What is the key characteristic of ${topic}?`,
        ];
  }
  if (level === "Advanced") {
    templates = templates.map((t) => (isUzbek ? `Tahlil qiling: ${t}` : `Analyze and determine: ${t}`));
  }

  const text = pick(templates);
  const correctIndex = Math.floor(Math.random() * 4);
  const optionLabels = isUzbek
    ? [`${topic} bilan bevosita bog'liq to'g'ri tushuncha`, `Umuman aloqasi yo'q tasodifiy variant`, `Qisman to'g'ri, lekin to'liq emas`, `Keng tarqalgan, ammo noto'g'ri tushuncha`]
    : [
        `The concept that correctly relates to ${topic}`,
        `An unrelated and incorrect option`,
        `A partially correct but incomplete answer`,
        `A common misconception about ${topic}`,
      ];
  // Rotate so the labeled "correct" one lands at correctIndex.
  const rotated = [...optionLabels.slice(4 - correctIndex), ...optionLabels.slice(0, 4 - correctIndex)];
  const letters = ["A", "B", "C", "D"];
  const options = rotated.map((label, i) => `${letters[i]}. ${label}`);

  const explanation = isUzbek
    ? `To'g'ri javob ${letters[correctIndex]}, chunki u ${topic} ga bevosita tegishli.`
    : `The correct answer is ${letters[correctIndex]} because it directly relates to ${topic}.`;

  return { text, options, correctIndex, explanation };
}

function buildFillBlank(topic: string, isUzbek: boolean, isGrammar: boolean): { text: string; answer: string; explanation: string } {
  if (isGrammar) {
    const [base, past] = pick(IRREGULAR_VERBS);
    const text = isUzbek ? `Gapni to'ldiring: '${base}' fe'lining o'tgan zamon shakli ______.` : `Complete the sentence: The past tense of '${base}' is ______.`;
    return {
      text,
      answer: past,
      explanation: isUzbek ? `'${base}' fe'lining o'tgan zamon shakli '${past}'.` : `The past tense of '${base}' is '${past}'.`,
    };
  }
  const text = isUzbek ? `Gapni to'ldiring: ${topic} tushunchasini bir so'z bilan ______ deb ta'riflash mumkin.` : `Complete the sentence: The concept of ${topic} can be summarized as ______.`;
  return {
    text,
    answer: "key concept",
    explanation: isUzbek ? `Bu yerda ${topic} ning asosiy g'oyasi so'ralmoqda.` : `This checks understanding of the core idea behind ${topic}.`,
  };
}

function buildTrueFalse(topic: string, isUzbek: boolean): { text: string; answer: "true" | "false"; explanation: string } {
  const answer: "true" | "false" = pick(["true", "false"]);
  const templates = isUzbek
    ? [`To'g'ri yoki noto'g'ri: ${topic} har doim har qanday holatda qo'llaniladi.`, `To'g'ri yoki noto'g'ri: ${topic} ni tushunish uchun oldindan bilim talab qilinadi.`]
    : [`True or False: ${topic} is always applicable in every context.`, `True or False: Understanding ${topic} requires prior knowledge of related concepts.`];
  const text = pick(templates);
  const explanation = isUzbek
    ? `Bu bayonot ${answer === "true" ? "to'g'ri" : "noto'g'ri"}, chunki ${topic} kontekstga bog'liq.`
    : `This statement is ${answer} because ${topic} depends on context.`;
  return { text, answer, explanation };
}

function buildShortAnswer(topic: string, isUzbek: boolean): { text: string; answer: string; explanation: string } {
  const text = isUzbek ? `Bir-uch so'z bilan javob bering: ${topic} bilan bog'liq asosiy atamani nomlang.` : `In one to three words, name a key term associated with ${topic}.`;
  return {
    text,
    answer: topic.split(" ")[0].toLowerCase(),
    explanation: isUzbek ? `${topic} bilan bog'liq asosiy atama kutilmoqda.` : `A key term directly tied to ${topic} is expected here.`,
  };
}

function buildEssay(topic: string, level: string, isUzbek: boolean): { text: string } {
  const base = isUzbek
    ? `${topic} ning ahamiyatini muhokama qiling va hayotdan ikkita misol keltiring.`
    : `Discuss the importance of ${topic} and provide two examples from real life.`;
  if (level === "Advanced") {
    return { text: isUzbek ? `${base} Fikringizni asoslang.` : `${base} Justify your reasoning with evidence.` };
  }
  return { text: base };
}

/**
 * Rule-based mock "AI" test generator — no external API calls. Swap for a
 * real OpenAI/Claude call later; generateTest's contract stays the same.
 */
export function generateMockTest(dto: GenerateTestDto): GeneratedTest {
  const { topic, subject, level } = dto;
  const language = dto.language ?? "uz";
  const isUzbek = language === "uz";
  const isGrammar = subject === "IELTS" && topic.toLowerCase().includes("grammar");

  const typePlan = planTypeCounts(dto.questionCount, dto.types);

  const questions: GeneratedQuestion[] = typePlan.map((type, index) => {
    const order = index + 1;
    if (type === "multiple_choice") {
      const { text, options, correctIndex, explanation } = buildMultipleChoice(topic, subject, level, isUzbek, isGrammar);
      return {
        type: "multiple_choice",
        text,
        options,
        correctAnswer: ["A", "B", "C", "D"][correctIndex],
        marks: marksForLevel(level),
        explanation,
        order,
      };
    }
    if (type === "fill_blank") {
      const { text, answer, explanation } = buildFillBlank(topic, isUzbek, isGrammar);
      return { type: "fill_blank", text, options: [], correctAnswer: answer, marks: marksForLevel(level), explanation, order };
    }
    if (type === "true_false") {
      const { text, answer, explanation } = buildTrueFalse(topic, isUzbek);
      return { type: "true_false", text, options: ["true", "false"], correctAnswer: answer, marks: marksForLevel(level), explanation, order };
    }
    if (type === "short_answer") {
      const { text, answer, explanation } = buildShortAnswer(topic, isUzbek);
      return { type: "short_answer", text, options: [], correctAnswer: answer, marks: marksForLevel(level), explanation, order };
    }
    // essay
    const { text } = buildEssay(topic, level, isUzbek);
    return {
      type: "essay",
      text,
      options: [],
      correctAnswer: null,
      marks: level === "Advanced" ? 5 : 3,
      explanation: null,
      order,
    };
  });

  const levelLabel = level ? ` — ${level}` : "";
  const title = `${topic}${levelLabel} Test`;
  const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
  const passMarks = Math.round(totalMarks * 0.6);

  return { title, questions, totalMarks, passMarks };
}
