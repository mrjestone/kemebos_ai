// MOCK ONLY: sample school data + a keyword matcher that stands in for the
// real RAG pipeline (embeddings + pgvector search filtered by access level).
// Access levels: public < student < staff. Admin sees everything.

export const ACCESS = {
  guest: ["public"],
  student: ["public", "student"],
  staff: ["public", "student", "staff"],
  admin: ["public", "student", "staff"],
};

export const KB = [
  {
    id: "parents-day",
    title: "Parents Day Calendar",
    access: "public",
    keywords: ["parents day", "parent day", "siku ya wazazi", "wazazi", "parents"],
    en: "Parents Day is held on the last Saturday of each term, starting at 9:00 am in the main hall. Parents can meet class teachers and see their children's work.",
    sw: "Siku ya Wazazi hufanyika Jumamosi ya mwisho ya kila muhula, kuanzia saa 3:00 asubuhi katika ukumbi mkuu. Wazazi hukutana na walimu wa darasa na kuona kazi za watoto wao.",
  },
  {
    id: "admission",
    title: "Admission Guide",
    access: "public",
    keywords: ["admission", "apply", "enrol", "join", "kujiunga", "usajili", "kujiandikisha", "udahili"],
    en: "To apply, collect an admission form from the school office, then return it with a birth certificate and two passport photos. Shortlisted pupils are invited for a short interview.",
    sw: "Ili kuomba nafasi, chukua fomu ya kujiunga ofisini, kisha irudishe pamoja na cheti cha kuzaliwa na picha mbili za pasipoti. Wanafunzi watakaochaguliwa huitwa kwa usaili mfupi.",
  },
  {
    id: "hours",
    title: "School Hours",
    access: "public",
    keywords: ["hours", "time", "open", "opening", "start", "saa", "muda", "ratiba ya siku"],
    en: "Lessons run from 7:30 am to 4:00 pm, Monday to Friday. The office is open from 7:00 am to 5:00 pm.",
    sw: "Masomo huanza saa 1:30 asubuhi hadi saa 10:00 jioni, Jumatatu hadi Ijumaa. Ofisi hufunguliwa saa 1:00 asubuhi hadi saa 11:00 jioni.",
  },
  {
    id: "contact",
    title: "Contact & Location",
    access: "public",
    keywords: ["contact", "address", "phone", "location", "where", "office", "mawasiliano", "anwani", "wapi", "simu", "ofisi"],
    en: "The school is in Bukoba. Postal address: P.O. Box 1054, Bukoba. You can also visit the school office during office hours.",
    sw: "Shule iko Bukoba. Anwani ya posta: S.L.P. 1054, Bukoba. Unaweza pia kutembelea ofisi ya shule wakati wa saa za kazi.",
  },
  {
    id: "fees",
    title: "Fee Payment Procedure",
    access: "student",
    keywords: ["fee", "fees", "pay", "payment", "payments", "ada", "kulipa", "malipo"],
    en: "School fees are paid through the school bank account, and the receipt is handed to the bursar's office to be stamped. Payment is due before the second week of each term.",
    sw: "Ada ya shule hulipwa kupitia akaunti ya benki ya shule, kisha risiti hupelekwa ofisi ya mhasibu kugongwa muhuri. Malipo hufanyika kabla ya wiki ya pili ya kila muhula.",
  },
  {
    id: "exams",
    title: "Exam Timetable",
    access: "student",
    keywords: ["exam", "exams", "test", "timetable", "mtihani", "mitihani", "ratiba"],
    en: "End-of-term exams start in the second-last week of the term. Pupils must carry their exam cards and arrive 20 minutes early.",
    sw: "Mitihani ya mwisho wa muhula huanza wiki ya pili kabla ya mwisho wa muhula. Wanafunzi wanapaswa kubeba kadi za mtihani na kufika dakika 20 mapema.",
  },
  {
    id: "leave",
    title: "Staff Leave Procedure",
    access: "staff",
    keywords: ["leave", "day off", "absent", "likizo", "ruhusa"],
    en: "Staff request leave by submitting the leave form to the head teacher at least one week in advance. Approval is confirmed in writing.",
    sw: "Walimu na wafanyakazi huomba ruhusa kwa kuwasilisha fomu ya likizo kwa mwalimu mkuu angalau wiki moja kabla. Idhini hutolewa kwa maandishi.",
  },
  {
    id: "budget",
    title: "Finance & Budget Policy",
    access: "staff",
    keywords: ["budget", "finance", "salary", "salaries", "bajeti", "mshahara", "mishahara", "fedha"],
    en: "Departmental budget requests are submitted to the bursar by the end of the first month of the term and reviewed by the head teacher.",
    sw: "Maombi ya bajeti ya idara huwasilishwa kwa mhasibu kabla ya mwisho wa mwezi wa kwanza wa muhula na kupitiwa na mwalimu mkuu.",
  },
];

const SW_WORDS = new Set([
  "nini", "lini", "vipi", "ada", "naweza", "shule", "saa", "wapi", "habari", "tafadhali",
  "je", "kuhusu", "mimi", "yetu", "ngapi", "nataka", "ni", "na", "kwa", "za", "ya", "wa",
  "mwalimu", "wazazi", "mtihani", "kujua", "ofisi",
]);

const words = (text) => text.toLowerCase().match(/[a-z']+/g) ?? [];

export function detectLanguage(text) {
  return words(text).some((w) => SW_WORDS.has(w)) ? "sw" : "en";
}

// Whole-word / whole-phrase match, so "off" never matches "coffee" or "office".
const has = (q, keyword) => new RegExp(`(^|[^a-z])${keyword}([^a-z]|$)`).test(q);

const TEXT = {
  greeting: {
    en: "Hello! I can help with school dates, procedures and general questions. What would you like to know?",
    sw: "Habari! Naweza kusaidia kuhusu tarehe, taratibu na maswali ya jumla ya shule. Ungependa kujua nini?",
  },
  unknown: {
    en: "I couldn't find that in the school information I have. Please contact the school office.",
    sw: "Sijapata jibu hilo katika taarifa za shule nilizonazo. Tafadhali wasiliana na ofisi ya shule.",
  },
  guestDenied: {
    en: "That information is for approved school members. Please sign in to see it.",
    sw: "Taarifa hiyo ni kwa wanachama wa shule walioidhinishwa. Tafadhali ingia ili kuiona.",
  },
  roleDenied: {
    en: "That information is restricted to staff.",
    sw: "Taarifa hiyo ni kwa walimu na wafanyakazi pekee.",
  },
};

/** Returns { text, lang, sources: [{id,title,access}], denied } */
export function answerQuestion(question, role = "guest") {
  const lang = detectLanguage(question);
  const q = question.toLowerCase();

  if (/^(hi|hello|hey|habari|mambo|hujambo|salaam?)\b/.test(q.trim())) {
    return { text: TEXT.greeting[lang], lang, sources: [], denied: false };
  }

  let best = null;
  let bestScore = 0;
  for (const entry of KB) {
    const score = entry.keywords.reduce((n, k) => n + (has(q, k) ? 1 : 0), 0);
    if (score > bestScore) [best, bestScore] = [entry, score];
  }
  if (!best) return { text: TEXT.unknown[lang], lang, sources: [], denied: false };

  if (!ACCESS[role].includes(best.access)) {
    const text = role === "guest" ? TEXT.guestDenied[lang] : TEXT.roleDenied[lang];
    return { text, lang, sources: [], denied: role === "guest" ? "login" : "role" };
  }
  const { id, title, access } = best;
  return { text: best[lang], lang, sources: [{ id, title, access }], denied: false };
}

export const SUGGESTIONS = [
  { text: "How much are Form One to Form Four school fees?", members: false },
  { text: "How do I get a joining form?", members: false },
  { text: "How much is the bus from Bukoba to Dar es Salaam?", members: false },
  { text: "Shule zitafungwa lini?", members: false },
];
