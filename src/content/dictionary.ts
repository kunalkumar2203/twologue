// Twologue content dictionary: every predefined line of content in one place.
// Voice: calm, warm, plain. Invitations, never instructions. No scores to beat, no streaks, no guilt.
// Items with an `id` are meant to be seeded into the database later (content_items), so keep ids stable.
// Plain strings may contain placeholders: {name} (you), {partner}, {date}, {count}, {days}.

/* ---------- Shared types ---------- */

export type Depth = "light" | "medium" | "deep";

export type Tag =
  | "everyday"
  | "playful"
  | "memories"
  | "gratitude"
  | "future"
  | "values"
  | "new-couple"
  | "years-together"
  | "long-distance";

export type Tier = "cute" | "future" | "spicy"; // spicy stays off unless the couple opts in

export interface Question {
  id: string;
  text: string;
  depth: Depth;
  tags?: Tag[];
}

/* =====================================================================
   1. DAILY CONNECTION
   ===================================================================== */

/* ---------- Daily questions (depth dial: light only, mixed, deep-leaning) ---------- */

export const DAILY_QUESTIONS: Question[] = [
  // Light
  { id: "dq-001", depth: "light", tags: ["everyday"], text: "What's a tiny thing that made you smile today?" },
  { id: "dq-002", depth: "light", tags: ["everyday", "playful"], text: "If we had a free Sunday with nothing planned, how would you want it to go?" },
  { id: "dq-003", depth: "light", tags: ["everyday"], text: "What's your go-to comfort food after a long day?" },
  { id: "dq-004", depth: "light", tags: ["playful"], text: "Which song could you play on repeat right now?" },
  { id: "dq-005", depth: "light", tags: ["memories"], text: "What's a smell that instantly makes you feel at home?" },
  { id: "dq-006", depth: "light", tags: ["playful"], text: "If you could eat only one cuisine for a year, what would it be?" },
  { id: "dq-007", depth: "light", tags: ["everyday"], text: "What's the best thing you ate this week?" },
  { id: "dq-008", depth: "light", tags: ["everyday"], text: "Which small ritual of yours would you never give up?" },
  { id: "dq-009", depth: "light", tags: ["memories"], text: "What's a place that feels like a warm hug to you?" },
  { id: "dq-010", depth: "light", tags: ["playful"], text: "What's the first film on our perfect movie-night list?" },
  { id: "dq-011", depth: "light", tags: ["everyday"], text: "What does your perfect cup of chai, coffee or tea moment look like?" },
  { id: "dq-012", depth: "light", tags: ["memories", "playful"], text: "What's something silly from childhood that still makes you laugh?" },
  { id: "dq-013", depth: "light", tags: ["playful"], text: "What's a skill you'd love to learn in one weekend?" },
  { id: "dq-014", depth: "light", text: "Which season feels most like you, and why?" },
  { id: "dq-015", depth: "light", tags: ["playful"], text: "What's the comfiest thing you own?" },
  { id: "dq-016", depth: "light", tags: ["playful"], text: "What nickname would our friends give us as a pair?" },
  { id: "dq-017", depth: "light", tags: ["everyday", "future"], text: "What's one thing you're looking forward to this week?" },
  { id: "dq-018", depth: "light", tags: ["everyday"], text: "What's a tiny luxury that makes an ordinary day better?" },
  { id: "dq-019", depth: "light", tags: ["playful"], text: "Which animal matches your mood today?" },
  { id: "dq-020", depth: "light", tags: ["everyday"], text: "What's the first thing you like to do when you get home?" },
  { id: "dq-021", depth: "light", tags: ["long-distance", "everyday"], text: "What did you see today that you wanted to show me?" },
  { id: "dq-022", depth: "light", tags: ["long-distance"], text: "What does the light look like where you are right now?" },
  { id: "dq-023", depth: "light", tags: ["new-couple", "gratitude"], text: "What's something you've noticed about me lately that you like?" },
  { id: "dq-024", depth: "light", tags: ["new-couple", "playful"], text: "What's a food you'd love to try together for the first time?" },
  { id: "dq-025", depth: "light", tags: ["years-together"], text: "Which small habit of ours would you keep forever?" },

  // Medium
  { id: "dq-026", depth: "medium", tags: ["memories", "gratitude"], text: "What's a small moment when you felt most connected to me?" },
  { id: "dq-027", depth: "medium", tags: ["everyday"], text: "What's something you've been thinking about a lot lately?" },
  { id: "dq-028", depth: "medium", tags: ["memories"], text: "Which memory of ours would you love to revisit?" },
  { id: "dq-029", depth: "medium", tags: ["values"], text: "When do you feel most like yourself?" },
  { id: "dq-030", depth: "medium", tags: ["gratitude"], text: "What's one thing I do that makes you feel looked after?" },
  { id: "dq-031", depth: "medium", tags: ["future"], text: "What's a dream you've kept mostly to yourself?" },
  { id: "dq-032", depth: "medium", tags: ["everyday"], text: "This week, did you need more rest, more fun, or more time with me?" },
  { id: "dq-033", depth: "medium", tags: ["everyday"], text: "What's one small way I could make your week easier?" },
  { id: "dq-034", depth: "medium", text: "What's something you used to worry about that doesn't bother you anymore?" },
  { id: "dq-035", depth: "medium", tags: ["new-couple", "memories"], text: "What's a story about your family that I haven't heard yet?" },
  { id: "dq-036", depth: "medium", tags: ["future"], text: "What's a tradition from your childhood you'd love us to have?" },
  { id: "dq-037", depth: "medium", tags: ["years-together", "memories"], text: "What's something we've done together that you're quietly proud of?" },
  { id: "dq-038", depth: "medium", tags: ["values"], text: "How do you like to be comforted on a rough day?" },
  { id: "dq-039", depth: "medium", tags: ["everyday"], text: "What's something about your work or studies you wish I understood better?" },
  { id: "dq-040", depth: "medium", tags: ["everyday"], text: "What does a good day look like for you, from start to finish?" },
  { id: "dq-041", depth: "medium", tags: ["memories"], text: "What's a compliment you've never forgotten?" },
  { id: "dq-042", depth: "medium", tags: ["future", "everyday"], text: "What's one thing you'd like us to do more of this month?" },
  { id: "dq-043", depth: "medium", text: "What's a risk you're glad you took?" },
  { id: "dq-044", depth: "medium", tags: ["new-couple"], text: "What's something you're curious to know about me?" },
  { id: "dq-045", depth: "medium", tags: ["years-together"], text: "Which part of our routine do you love the most?" },
  { id: "dq-046", depth: "medium", tags: ["new-couple", "memories"], text: "What's an early moment between us that you still think about?" },
  { id: "dq-047", depth: "medium", tags: ["gratitude"], text: "What's something small I did recently that meant a lot to you?" },
  { id: "dq-048", depth: "medium", tags: ["long-distance"], text: "What has the distance taught you about us?" },
  { id: "dq-049", depth: "medium", tags: ["long-distance"], text: "What do you miss most about being in the same room?" },
  { id: "dq-050", depth: "medium", tags: ["memories", "future"], text: "Which place would you love to go back to with me?" },

  // Deep
  { id: "dq-051", depth: "deep", tags: ["future"], text: "What are you hoping for that you haven't said out loud yet?" },
  { id: "dq-052", depth: "deep", tags: ["values"], text: "What helps you feel safe telling me something hard?" },
  { id: "dq-053", depth: "deep", tags: ["values"], text: "What's a belief you hold now that you didn't five years ago?" },
  { id: "dq-054", depth: "deep", tags: ["gratitude"], text: "When did you last feel truly understood by me?" },
  { id: "dq-055", depth: "deep", tags: ["values"], text: "What's something you're learning to be kinder to yourself about?" },
  { id: "dq-056", depth: "deep", tags: ["future", "values"], text: "What does home mean to you, and how can we build it together?" },
  { id: "dq-057", depth: "deep", tags: ["future"], text: "What's a worry you carry about the future, and what would make it feel lighter?" },
  { id: "dq-058", depth: "deep", tags: ["values"], text: "What's something you'd like us to talk about more openly?" },
  { id: "dq-059", depth: "deep", tags: ["values"], text: "What's one thing from your past that shaped how you love?" },
  { id: "dq-060", depth: "deep", tags: ["years-together"], text: "How have you changed since we met?" },
  { id: "dq-061", depth: "deep", tags: ["future"], text: "What do you want our life to feel like in five years?" },
  { id: "dq-062", depth: "deep", tags: ["gratitude", "years-together"], text: "What have I taught you without meaning to?" },
  { id: "dq-063", depth: "deep", tags: ["gratitude"], text: "When were you last proud of me?" },
  { id: "dq-064", depth: "deep", tags: ["values"], text: "When do you need me most, even if you don't say so?" },
  { id: "dq-065", depth: "deep", tags: ["values"], text: "What does being supported look like for you on a hard day?" },
  { id: "dq-066", depth: "deep", tags: ["values"], text: "What do you hope we're like when we disagree?" },
  { id: "dq-067", depth: "deep", tags: ["values"], text: "What's something about love you're still figuring out?" },
  { id: "dq-068", depth: "deep", tags: ["gratitude"], text: "What would you like to thank me for, but haven't yet?" },
  { id: "dq-069", depth: "deep", tags: ["future", "values"], text: "What do you want us to protect, however busy life gets?" },
  { id: "dq-070", depth: "deep", tags: ["values"], text: "What's the kindest thing anyone has done for you, and what did it teach you?" },
  { id: "dq-071", depth: "deep", tags: ["future"], text: "Which of my dreams would you love to help come true?" },
  { id: "dq-072", depth: "deep", tags: ["future", "years-together"], text: "What do you picture us doing when we're much older?" },
  { id: "dq-073", depth: "deep", tags: ["years-together"], text: "What do you hope we never stop doing?" },
  { id: "dq-074", depth: "deep", tags: ["values"], text: "How could I show my love in a way that feels clearer to you?" },
  { id: "dq-075", depth: "deep", tags: ["long-distance"], text: "What would make the distance feel smaller for you this month?" },
];

/* ---------- Appreciation notes ---------- */

export const APPRECIATION = {
  starters: [
    "Thank you for…",
    "I loved it when you…",
    "I noticed that you…",
    "It meant a lot when you…",
    "One thing I admire about you is…",
    "You made my day when…",
    "Thank you for always…",
    "I felt cared for today because you…",
    "I'm grateful that you…",
    "Something small you did that I noticed…",
  ],
  // Gentle nudges for the blank page
  thinkAbout: [
    "Something they did without being asked",
    "A moment they made you laugh",
    "A hard day they helped you through",
    "A small habit of theirs you'd miss",
    "Something they said that stayed with you",
    "A way they made your week easier",
  ],
  emojis: ["💛", "🌸", "☕", "🌙", "✨", "🫶"],
};

/* ---------- Micro daily challenges ---------- */

export type ChallengeCategory = "affection" | "words" | "play" | "reflection" | "service";

export interface Challenge {
  id: string;
  category: ChallengeCategory;
  text: string;
  remoteText?: string; // used for long-distance couples when the task needs the same room
  spicy?: true; // opt-in only
}

export const CHALLENGES: Challenge[] = [
  // Affection
  { id: "mc-001", category: "affection", text: "Give a 20-second hug, and let it last a little longer than usual.", remoteText: "Send a short voice note that sounds like a 20-second hug." },
  { id: "mc-002", category: "affection", text: "Hold hands for a few minutes today, even if you're just sitting.", remoteText: "Send a photo of your hand around something warm, and call it today's hand-hold." },
  { id: "mc-003", category: "affection", text: "Sit close and lean on each other for five quiet minutes.", remoteText: "Stay on a call for five minutes with no talking, just being together." },
  { id: "mc-004", category: "affection", text: "Give a gentle kiss somewhere unexpected today.", remoteText: "Blow them a kiss in a short voice note." },
  { id: "mc-005", category: "affection", text: "Offer a two-minute shoulder or foot rub.", remoteText: "Send three songs to help them unwind tonight." },
  { id: "mc-006", category: "affection", spicy: true, text: "Say something flirty that makes them smile." },

  // Words
  { id: "mc-007", category: "words", text: "Tell them one thing you admire about how they handled something this week." },
  { id: "mc-008", category: "words", text: "Send a voice note about a favourite memory of the two of you." },
  { id: "mc-009", category: "words", text: "Choose three words that describe them today, and tell them." },
  { id: "mc-010", category: "words", text: "Say \"I'm glad it's you\" out loud, or in a message." },
  { id: "mc-011", category: "words", text: "Share a compliment you've thought but never said." },
  { id: "mc-012", category: "words", text: "Leave a sticky note with something kind where they'll find it.", remoteText: "Schedule a kind message to reach them right when they wake up." },

  // Play
  { id: "mc-013", category: "play", text: "Draw each other in two minutes, then compare.", remoteText: "Draw each other in two minutes and swap the photos." },
  { id: "mc-014", category: "play", text: "Invent a secret handshake together." , remoteText: "Invent a secret handshake over video and teach it to each other." },
  { id: "mc-015", category: "play", text: "Dance to one song in the kitchen.", remoteText: "Pick one song and dance to it on a video call." },
  { id: "mc-016", category: "play", text: "Each reveal your most useless talent, and show it off." },
  { id: "mc-017", category: "play", text: "Take a silly photo with the same expression.", remoteText: "Take a silly photo with the same expression and swap them." },
  { id: "mc-018", category: "play", text: "Give each other a brand-new nickname, for today only." },

  // Reflection
  { id: "mc-019", category: "reflection", text: "Each name one thing you'd like to do more of this month, then share." },
  { id: "mc-020", category: "reflection", text: "Pick a moment from this week you want to remember, and say why." },
  { id: "mc-021", category: "reflection", text: "Share a small worry, and one thing that would make it lighter." },
  { id: "mc-022", category: "reflection", text: "Tell them something you learned about yourself this week." },
  { id: "mc-023", category: "reflection", text: "Tell them one thing you're looking forward to doing together." },
  { id: "mc-024", category: "reflection", text: "Choose a photo that makes you smile, and tell the story behind it." },

  // Service
  { id: "mc-025", category: "service", text: "Make them a drink exactly the way they like it.", remoteText: "Send them the recipe for the drink you'd make them next time." },
  { id: "mc-026", category: "service", text: "Quietly take one small chore off their plate.", remoteText: "Ask, \"What's one thing I can take off your plate this week?\"" },
  { id: "mc-027", category: "service", text: "Set out something they'll need tomorrow.", remoteText: "Send a note that helps them get ready for tomorrow." },
  { id: "mc-028", category: "service", text: "Play their favourite song softly while they're busy.", remoteText: "Send their favourite song with a note: \"for the long day.\"" },
  { id: "mc-029", category: "service", text: "Ask, \"How can I make today a little easier?\" and do one thing they say." },
  { id: "mc-030", category: "service", text: "Plan a small treat for the weekend, and keep it a surprise." },
];

/* =====================================================================
   2. SHARED JOURNALING
   ===================================================================== */

/* ---------- Blind-reveal journal prompts (same prompt for both partners) ---------- */

export const JOURNAL_PROMPTS: Question[] = [
  { id: "jp-001", depth: "light", tags: ["memories"], text: "Describe our last really good day using only what you saw, heard and smelled." },
  { id: "jp-002", depth: "medium", tags: ["future"], text: "Write a short letter to us from five years from now." },
  { id: "jp-003", depth: "light", tags: ["everyday"], text: "What's a small thing in our routine that you'd miss if it disappeared?" },
  { id: "jp-004", depth: "medium", tags: ["gratitude"], text: "Write about a moment this week when you felt close to me." },
  { id: "jp-005", depth: "light", tags: ["memories", "new-couple"], text: "Describe the first time you really noticed me." },
  { id: "jp-006", depth: "light", tags: ["future"], text: "List three things you'd like to say yes to this month." },
  { id: "jp-007", depth: "light", tags: ["memories"], text: "Write about a meal we shared that you still remember." },
  { id: "jp-008", depth: "deep", tags: ["new-couple", "values"], text: "What's something you felt early on that you never told me?" },
  { id: "jp-009", depth: "medium", tags: ["values"], text: "What did you need this week that you didn't ask for?" },
  { id: "jp-010", depth: "medium", tags: ["memories"], text: "Write about a place that holds a memory for us." },
  { id: "jp-011", depth: "medium", tags: ["playful"], text: "Describe our relationship as a place. What does it look, sound and smell like?" },
  { id: "jp-012", depth: "medium", tags: ["values"], text: "What's on your mind lately, and what would make it feel lighter?" },
  { id: "jp-013", depth: "light", tags: ["gratitude"], text: "Write down three tiny moments from this week you're grateful for." },
  { id: "jp-014", depth: "medium", tags: ["gratitude"], text: "What's something you admire about me that you rarely say?" },
  { id: "jp-015", depth: "light", tags: ["playful"], text: "If this week had a title, what would it be, and why?" },
  { id: "jp-016", depth: "medium", tags: ["years-together"], text: "Tell the version of you from a year ago what has changed between us." },
  { id: "jp-017", depth: "deep", tags: ["future"], text: "What do you hope for the next chapter of our life?" },
  { id: "jp-018", depth: "light", tags: ["everyday"], text: "What makes a quiet evening with me feel just right?" },
  { id: "jp-019", depth: "medium", tags: ["future"], text: "Describe an ordinary Tuesday in our future, hour by hour." },
  { id: "jp-020", depth: "light", tags: ["memories", "playful"], text: "Write about a time we laughed until it hurt." },
  { id: "jp-021", depth: "deep", tags: ["values"], text: "What would you like me to know about your inner world this week?" },
  { id: "jp-022", depth: "medium", tags: ["long-distance"], text: "What has the distance shown you this month?" },
  { id: "jp-023", depth: "medium", tags: ["gratitude"], text: "Describe the last time you felt completely at ease with me." },
  { id: "jp-024", depth: "light", tags: ["future"], text: "What's one thing you'd like us to try together this season?" },
  { id: "jp-025", depth: "deep", tags: ["values"], text: "What's a feeling you've been carrying that you'd like to set down here?" },
];

/* ---------- Alternating story: opening lines ---------- */

export interface StoryStarter {
  id: string;
  kind: "fiction" | "our-future";
  text: string;
}

export const STORY_STARTERS: StoryStarter[] = [
  { id: "ss-001", kind: "fiction", text: "The lighthouse had been dark for forty years, until tonight." },
  { id: "ss-002", kind: "fiction", text: "Nobody in the village could explain why the bakery always smelled of rain." },
  { id: "ss-003", kind: "fiction", text: "On the last train home, someone had left a small blue suitcase behind." },
  { id: "ss-004", kind: "fiction", text: "The old map had one place circled in red, and a note that said, \"Wait for me.\"" },
  { id: "ss-005", kind: "fiction", text: "When the power went out across the city, the sky finally showed its stars." },
  { id: "ss-006", kind: "fiction", text: "The letter was addressed to someone who hadn't lived in the house for years." },
  { id: "ss-007", kind: "fiction", text: "At the edge of the market, a new stall appeared that sold only borrowed memories." },
  { id: "ss-008", kind: "fiction", text: "It rained every evening at six, but only on one balcony." },
  { id: "ss-009", kind: "our-future", text: "It's a quiet Sunday, five years from now, and the first thing we notice is…" },
  { id: "ss-010", kind: "our-future", text: "We finally move into the home with the window that catches the morning light. The first thing we unpack is…" },
  { id: "ss-011", kind: "our-future", text: "On our tenth anniversary, we take the trip we've talked about for years. It begins when…" },
  { id: "ss-012", kind: "our-future", text: "Somewhere ahead of us there's a small kitchen, and in it we're making…" },
  { id: "ss-013", kind: "our-future", text: "A year from now we open a box we sealed today. Inside, we find…" },
  { id: "ss-014", kind: "our-future", text: "Our favourite evening ritual, years from now, goes like this…" },
];

/* ---------- Time capsule ---------- */

export const CAPSULE_OCCASIONS = [
  { id: "six-months", label: "In 6 months", months: 6 },
  { id: "one-year", label: "In 1 year", months: 12 },
  { id: "anniversary", label: "On our anniversary", months: null },
  { id: "custom", label: "Pick a date", months: null },
];

export const CAPSULE_PROMPTS: string[] = [
  "Dear us, six months from now. Here's what today feels like…",
  "Tell future us what you're hoping for.",
  "Write down what you love most about us right now.",
  "Describe an ordinary day at this moment, so we remember it.",
  "Share a worry you hope has faded by the time you read this.",
  "Tell the story of how today went.",
  "Tell them what you want them to remember about this season.",
  "Leave a promise you'd like us to keep.",
  "Write a small thank-you for something they did this week.",
  "Describe your favourite photo of us, and why.",
];

/* =====================================================================
   3. GAMES AND ACTIVITIES
   ===================================================================== */

/* ---------- "How well do you know me?" ----------
   `topic` is a noun phrase so one template can build both sides of the game:
   the answerer sees ask("your ..."), the guesser sees guess("their ...").
   No choices means a short typed answer. */

export interface KnowMeQuestion {
  id: string;
  topic: string;
  choices?: string[];
}

export const KNOW_ME_TEMPLATES = {
  ask: "What's your {topic}?",
  guess: "What did they say is their {topic}?",
};

export const KNOW_ME_QUESTIONS: KnowMeQuestion[] = [
  { id: "km-001", topic: "ideal weekend morning", choices: ["A slow breakfast, no plans", "A long walk or run", "Sleeping in", "Seeing family or friends"] },
  { id: "km-002", topic: "comfort food on a sad day", choices: ["Something sweet", "Something spicy", "Something warm and soupy", "Something crispy"] },
  { id: "km-003", topic: "way to relax after a long day", choices: ["Music or a podcast", "A show or a film", "Scrolling or texting", "Quiet with a warm drink"] },
  { id: "km-004", topic: "favourite weather", choices: ["Rain", "Sunshine", "A cool breeze", "A foggy morning"] },
  { id: "km-005", topic: "dream kind of holiday", choices: ["Beach", "Mountains", "A big city", "The countryside"] },
  { id: "km-006", topic: "smallest everyday annoyance", choices: ["Being kept waiting", "Mess", "Loud chewing", "Slow internet"] },
  { id: "km-007", topic: "way to celebrate a birthday", choices: ["A quiet dinner", "A big party", "A surprise", "A little trip"] },
  { id: "km-008", topic: "pick for a movie night", choices: ["Comedy", "Thriller", "Romance", "Documentary"] },
  { id: "km-009", topic: "favourite way to feel loved", choices: ["Kind words", "Quality time", "A hug", "Someone helping out"] },
  { id: "km-010", topic: "favourite time of day", choices: ["Sunrise", "Afternoon", "Evening", "Late at night"] },
  { id: "km-011", topic: "dream pet", choices: ["A dog", "A cat", "Birds or fish", "No pets, thanks"] },
  { id: "km-012", topic: "go-to reaction when stressed", choices: ["Get quiet", "Talk it out", "Keep busy", "Take a nap"] },
  { id: "km-013", topic: "dream dinner", choices: ["Street food", "A home-cooked meal", "Fine dining", "A picnic"] },
  { id: "km-014", topic: "most treasured thing", choices: ["Photos and memories", "A favourite book or gadget", "A gift from someone", "A piece of clothing"] },
  { id: "km-015", topic: "way to spend a small surprise windfall", choices: ["Travel", "Food", "Something to keep", "Something for someone else"] },
  { id: "km-016", topic: "daily ritual I'd never skip", choices: ["Morning chai or coffee", "An evening walk", "A bedtime scroll", "A call home"] },
  { id: "km-017", topic: "idea of a perfect gift", choices: ["Something handmade", "An experience", "Something useful", "A surprise"] },
  { id: "km-018", topic: "scent that takes me back to childhood" },
  { id: "km-019", topic: "song that always cheers me up" },
  { id: "km-020", topic: "dream job as a child" },
];

/* ---------- Quick games: would you rather, this or that ---------- */

export interface QuickGame {
  id: string;
  game: "would-you-rather" | "this-or-that";
  a: string;
  b: string;
  tier: Tier;
}

export const QUICK_GAMES: QuickGame[] = [
  // Would you rather: cute
  { id: "qg-001", game: "would-you-rather", tier: "cute", a: "Breakfast in bed", b: "Dinner under the stars" },
  { id: "qg-002", game: "would-you-rather", tier: "cute", a: "A surprise picnic", b: "A surprise weekend trip" },
  { id: "qg-003", game: "would-you-rather", tier: "cute", a: "Cuddle up with a film", b: "Dance in the living room" },
  { id: "qg-004", game: "would-you-rather", tier: "cute", a: "Write each other letters", b: "Send each other voice notes" },
  { id: "qg-005", game: "would-you-rather", tier: "cute", a: "A rainy day indoors", b: "A sunny day out" },
  { id: "qg-006", game: "would-you-rather", tier: "cute", a: "Matching pyjamas", b: "Matching socks" },
  // Would you rather: future
  { id: "qg-007", game: "would-you-rather", tier: "future", a: "A small flat in the city", b: "A house in the hills" },
  { id: "qg-008", game: "would-you-rather", tier: "future", a: "Travel for a year", b: "Build our dream home" },
  { id: "qg-009", game: "would-you-rather", tier: "future", a: "A lively full table every month", b: "A quiet table for two every week" },
  { id: "qg-010", game: "would-you-rather", tier: "future", a: "Learn a language together", b: "Learn an instrument together" },
  { id: "qg-011", game: "would-you-rather", tier: "future", a: "Grow a garden together", b: "Cook a new recipe every week" },
  { id: "qg-012", game: "would-you-rather", tier: "future", a: "Move somewhere new together", b: "Stay and make our place even more ours" },
  // Would you rather: spicy (mild, opt-in)
  { id: "qg-013", game: "would-you-rather", tier: "spicy", a: "A slow dance in the kitchen", b: "A candlelit dinner with no phones" },
  { id: "qg-014", game: "would-you-rather", tier: "spicy", a: "Whisper a compliment in their ear", b: "Leave a love note for later" },
  { id: "qg-015", game: "would-you-rather", tier: "spicy", a: "A long hug before leaving", b: "A long hug on coming home" },

  // This or that: cute
  { id: "qg-016", game: "this-or-that", tier: "cute", a: "Chai", b: "Coffee" },
  { id: "qg-017", game: "this-or-that", tier: "cute", a: "Beach", b: "Mountains" },
  { id: "qg-018", game: "this-or-that", tier: "cute", a: "Sunrise", b: "Sunset" },
  { id: "qg-019", game: "this-or-that", tier: "cute", a: "Cook at home", b: "Order in" },
  { id: "qg-020", game: "this-or-that", tier: "cute", a: "Rain", b: "Sunshine" },
  { id: "qg-021", game: "this-or-that", tier: "cute", a: "Early bird", b: "Night owl" },
  { id: "qg-022", game: "this-or-that", tier: "cute", a: "Sweet", b: "Savoury" },
  { id: "qg-023", game: "this-or-that", tier: "cute", a: "Plan everything", b: "Go with the flow" },
  { id: "qg-024", game: "this-or-that", tier: "cute", a: "Text", b: "Call" },
  { id: "qg-025", game: "this-or-that", tier: "cute", a: "Slow breakfast", b: "Long walk" },
  { id: "qg-026", game: "this-or-that", tier: "cute", a: "Rewatch a favourite", b: "Try something new" },
  { id: "qg-027", game: "this-or-that", tier: "cute", a: "Handwritten letter", b: "Voice note" },
  { id: "qg-028", game: "this-or-that", tier: "cute", a: "Train", b: "Road trip" },
  { id: "qg-029", game: "this-or-that", tier: "cute", a: "Books", b: "Podcasts" },
  // This or that: future
  { id: "qg-030", game: "this-or-that", tier: "future", a: "Big celebration", b: "Small gathering" },
  { id: "qg-031", game: "this-or-that", tier: "future", a: "Buy a home", b: "Rent and roam" },
  { id: "qg-032", game: "this-or-that", tier: "future", a: "Dog", b: "Cat" },
  { id: "qg-033", game: "this-or-that", tier: "future", a: "Save for travel", b: "Save for a home" },
  { id: "qg-034", game: "this-or-that", tier: "future", a: "City life", b: "Countryside life" },
  // This or that: spicy (mild, opt-in)
  { id: "qg-035", game: "this-or-that", tier: "spicy", a: "Candlelight", b: "Fairy lights" },
  { id: "qg-036", game: "this-or-that", tier: "spicy", a: "Slow dance", b: "Fast dance" },
  { id: "qg-037", game: "this-or-that", tier: "spicy", a: "Hug", b: "Kiss on the cheek" },
];

/* ---------- Two truths and a lie ---------- */

export const TWO_TRUTHS = {
  // Ideas to help write the three statements
  starters: [
    "Something I did as a kid",
    "A place I've been",
    "Something I'm secretly good at",
    "A food I tried once",
    "Something that happened to a friend or relative",
    "A thing I'm afraid of, or not afraid of",
    "A job or chore I once had",
    "Something I almost did",
  ],
  // After the guess, each statement gets its story
  storyBehind: [
    "Tell the story behind your favourite truth.",
    "What made you choose that lie?",
    "Which truth surprised them the most?",
    "What's a story you'd like to tell next time?",
  ],
};

/* ---------- Shared bucket list and dream board ---------- */

export type BucketCategory = "travel" | "home" | "fun" | "food" | "learning" | "giving-back" | "us";

export interface BucketIdea {
  id: string;
  category: BucketCategory;
  text: string;
}

export const BUCKET_IDEAS: BucketIdea[] = [
  { id: "bl-001", category: "travel", text: "Watch a sunrise from somewhere we've never been" },
  { id: "bl-002", category: "travel", text: "Take a train journey with no fixed plan" },
  { id: "bl-003", category: "travel", text: "Visit a place neither of us has heard of" },
  { id: "bl-004", category: "travel", text: "Spend a weekend in a tiny cabin in the mountains" },
  { id: "bl-005", category: "travel", text: "Revisit the first place we travelled to together" },
  { id: "bl-006", category: "travel", text: "Sleep under a clear sky, far from city lights" },
  { id: "bl-007", category: "home", text: "Plant a tree or a herb pot together" },
  { id: "bl-008", category: "home", text: "Make a wall of our favourite photos" },
  { id: "bl-009", category: "home", text: "Build a reading nook for two" },
  { id: "bl-010", category: "home", text: "Paint a room together and not worry about the mess" },
  { id: "bl-011", category: "fun", text: "Spend a night in a pillow fort" },
  { id: "bl-012", category: "fun", text: "Learn a dance step together" },
  { id: "bl-013", category: "fun", text: "Go to a live music show" },
  { id: "bl-014", category: "fun", text: "Take a pottery or painting class" },
  { id: "bl-015", category: "fun", text: "Play every board game we own" },
  { id: "bl-016", category: "food", text: "Cook a dish from each other's childhood" },
  { id: "bl-017", category: "food", text: "Try a new street food every month for a year" },
  { id: "bl-018", category: "food", text: "Bake a cake from scratch together" },
  { id: "bl-019", category: "food", text: "Host a dinner for the people we love" },
  { id: "bl-020", category: "learning", text: "Learn a few phrases of a new language" },
  { id: "bl-021", category: "learning", text: "Take up a hobby we can both be terrible at" },
  { id: "bl-022", category: "learning", text: "Read the same book and talk about it" },
  { id: "bl-023", category: "giving-back", text: "Volunteer together for a day" },
  { id: "bl-024", category: "giving-back", text: "Plant trees for a cause" },
  { id: "bl-025", category: "giving-back", text: "Donate something that's special to us" },
  { id: "bl-026", category: "us", text: "Write each other a letter to open in a year" },
  { id: "bl-027", category: "us", text: "Start a tradition that's ours alone" },
  { id: "bl-028", category: "us", text: "Take a photo in the same spot every year" },
];

// "Our life in 5 years": prompts for the dream board
export const DREAM_BOARD_PROMPTS: string[] = [
  "Where do we wake up?",
  "What does our morning look like?",
  "Who's around our table?",
  "What does a weekend feel like?",
  "What are we proud of building?",
  "What are we still learning?",
  "How do we spend our evenings?",
  "What's on our walls?",
];

/* ---------- Date night generator ---------- */

export type DateTime = "30-minutes" | "2-hours" | "evening";
export type DateMood = "cozy" | "adventurous" | "romantic" | "silly";
export type DatePlace = "home" | "out" | "online";
export type Energy = "low" | "medium" | "high";

export interface DateIdea {
  id: string;
  title: string;
  text: string;
  time: DateTime;
  mood: DateMood;
  place: DatePlace;
  energy: Energy;
  linkedGame?: "know-me" | "quick-games" | "two-truths"; // at-home ideas can open a game inside the app
}

export const DATE_IDEAS: DateIdea[] = [
  // 30 minutes
  { id: "dn-001", time: "30-minutes", mood: "cozy", place: "home", energy: "low", title: "Blanket and a shared playlist", text: "Pick five songs each, then listen together under one blanket." },
  { id: "dn-002", time: "30-minutes", mood: "cozy", place: "out", energy: "low", title: "Walk to the nearest tea stall", text: "Find the closest chai or coffee spot and sit by the window." },
  { id: "dn-003", time: "30-minutes", mood: "cozy", place: "online", energy: "low", title: "Same drink, different homes", text: "Make the same hot drink and sip it together on a call." },
  { id: "dn-004", time: "30-minutes", mood: "adventurous", place: "home", energy: "medium", title: "Cook something new", text: "Pick a recipe at random and make it in half an hour." },
  { id: "dn-005", time: "30-minutes", mood: "adventurous", place: "out", energy: "medium", title: "Left, right, left", text: "Walk and take turns choosing at every corner. See where you end up." },
  { id: "dn-006", time: "30-minutes", mood: "adventurous", place: "online", energy: "low", title: "Virtual tour", text: "Pick a faraway place and wander through it together on a map." },
  { id: "dn-007", time: "30-minutes", mood: "romantic", place: "home", energy: "low", title: "Lights low, phones away", text: "Dim the lights and share one favourite memory each.", linkedGame: "know-me" },
  { id: "dn-008", time: "30-minutes", mood: "romantic", place: "out", energy: "low", title: "Sunset sit", text: "Find a spot to watch the light change. No phones." },
  { id: "dn-009", time: "30-minutes", mood: "romantic", place: "online", energy: "low", title: "Voice note love letters", text: "Record a one-minute voice note each, then listen together." },
  { id: "dn-010", time: "30-minutes", mood: "silly", place: "home", energy: "high", title: "Kitchen dance-off", text: "Pick a song, set a timer, and dance badly on purpose." },
  { id: "dn-011", time: "30-minutes", mood: "silly", place: "out", energy: "medium", title: "Rate the neighbourhood", text: "Walk around giving funny awards to shops, trees and street dogs." },
  { id: "dn-012", time: "30-minutes", mood: "silly", place: "online", energy: "low", title: "Doodle duel", text: "Draw each other in 60 seconds and share the results." },

  // 2 hours
  { id: "dn-013", time: "2-hours", mood: "cozy", place: "home", energy: "low", title: "Film with pauses", text: "Watch a favourite film and pause to share the memories it brings up." },
  { id: "dn-014", time: "2-hours", mood: "cozy", place: "out", energy: "low", title: "Bookshop and tea", text: "Pick a book for each other, then read a page aloud over tea." },
  { id: "dn-015", time: "2-hours", mood: "cozy", place: "online", energy: "low", title: "Watch-together night", text: "Start the same show at the same time and chat as you go." },
  { id: "dn-016", time: "2-hours", mood: "adventurous", place: "home", energy: "medium", title: "Cook the world", text: "Choose a country, cook one dish, and play its music." },
  { id: "dn-017", time: "2-hours", mood: "adventurous", place: "out", energy: "high", title: "A first for both of you", text: "Do something neither of you has done: a class, a market, a trail." },
  { id: "dn-018", time: "2-hours", mood: "adventurous", place: "online", energy: "medium", title: "Escape room, online", text: "Solve a virtual escape room together." },
  { id: "dn-019", time: "2-hours", mood: "romantic", place: "home", energy: "low", title: "Candlelit dinner, no screens", text: "Cook together, set the table, and leave phones in another room." },
  { id: "dn-020", time: "2-hours", mood: "romantic", place: "out", energy: "low", title: "Dessert first", text: "Skip dinner, go for dessert, and take the long way home." },
  { id: "dn-021", time: "2-hours", mood: "romantic", place: "online", energy: "low", title: "Long-distance dinner", text: "Order each other's favourite meal and eat together on video." },
  { id: "dn-022", time: "2-hours", mood: "silly", place: "home", energy: "medium", title: "Indoor olympics", text: "Invent five tiny events, like sock toss and humming contests." },
  { id: "dn-023", time: "2-hours", mood: "silly", place: "out", energy: "medium", title: "Photo scavenger hunt", text: "Make a list of silly things to find and photograph around town." },
  { id: "dn-024", time: "2-hours", mood: "silly", place: "online", energy: "medium", title: "Karaoke call", text: "Take turns picking songs and sing along together.", linkedGame: "quick-games" },

  // Evening
  { id: "dn-025", time: "evening", mood: "cozy", place: "home", energy: "low", title: "Pillow-fort evening", text: "Build a fort, bring snacks, and stay as long as you like." },
  { id: "dn-026", time: "evening", mood: "cozy", place: "out", energy: "low", title: "Slow dinner at a favourite place", text: "Go back to somewhere that matters to you and take your time." },
  { id: "dn-027", time: "evening", mood: "cozy", place: "online", energy: "low", title: "Two screens, one dinner", text: "Eat together on video and share one good thing from the day." },
  { id: "dn-028", time: "evening", mood: "adventurous", place: "home", energy: "medium", title: "Indoor camping", text: "Set up a tent or blankets, tell stories, and eat snacks by torchlight.", linkedGame: "two-truths" },
  { id: "dn-029", time: "evening", mood: "adventurous", place: "out", energy: "high", title: "Night market wander", text: "Explore a market you don't know and try three new things." },
  { id: "dn-030", time: "evening", mood: "adventurous", place: "online", energy: "medium", title: "Learn something together", text: "Take a short online class, like a dance, a recipe or a language." },
  { id: "dn-031", time: "evening", mood: "romantic", place: "home", energy: "low", title: "Dress up for dinner at home", text: "Put on something nice and have a long dinner with the good plates." },
  { id: "dn-032", time: "evening", mood: "romantic", place: "out", energy: "low", title: "Stargazing", text: "Find a dark spot, bring a blanket, and name the stars you know." },
  { id: "dn-033", time: "evening", mood: "romantic", place: "online", energy: "low", title: "Letters and a playlist", text: "Read each other a letter you wrote earlier, and share a song." },
  { id: "dn-034", time: "evening", mood: "silly", place: "home", energy: "medium", title: "Invent a board game", text: "Make up a game from whatever is lying around the house.", linkedGame: "quick-games" },
  { id: "dn-035", time: "evening", mood: "silly", place: "out", energy: "high", title: "Bowling or arcade night", text: "Play something you're both bad at, and cheer for each other." },
  { id: "dn-036", time: "evening", mood: "silly", place: "online", energy: "low", title: "Quiz each other", text: "Write ten questions about each other and quiz one another on a call.", linkedGame: "know-me" },
];

/* =====================================================================
   4. THE TWOLOGUE VOICE
   Short lines for headers, pauses, reminders and empty states.
   Rules: never guilt, never rush, no streak language, no "you missed".
   ===================================================================== */

export const VOICE = {
  /* Hero and header lines (the main one on the landing page is the first) */
  taglines: [
    "A small daily space for the two of you.",
    "Five minutes. Two people. One quiet space.",
    "The little things, together.",
    "Say it your way. Hear it together.",
    "A softer way to stay close.",
    "Every day, a small way in.",
  ],

  /* Pauses between sections, on loading screens and in footers */
  quotes: [
    "Closeness is built from small moments, not big ones.",
    "You don't need perfect words, only honest ones.",
    "Some answers are better when shared at the same time.",
    "A good question is a small door held open.",
    "Being understood is a quiet kind of luck.",
    "Two people, one slow conversation.",
    "Paying attention is how love says hello every day.",
    "The ordinary days are the ones that hold us together.",
    "Slow is fine. Soft is fine. Showing up is enough.",
    "Nothing to win here, only each other to find.",
    "What you notice, you cherish.",
    "Small things, said often, become a language.",
    "Every answer is a postcard from inside someone's head.",
    "Take turns being brave.",
    "Be curious about them like it's the first week.",
    "A pause is also a way of listening.",
    "You're not behind. You're right on time, together.",
    "Quiet moments count too.",
  ],

  /* Today screen greetings, by time of day */
  greetings: {
    morning: [
      "Good morning, {name}. Today's question is waiting.",
      "A slow start is fine, {name}.",
      "Morning, {name}. One small thing for the two of you.",
    ],
    afternoon: [
      "Good afternoon, {name}. Got a minute for the two of you?",
      "Hello, {name}. Take a breath between things.",
      "Afternoon, {name}. A little pause, just for you two.",
    ],
    evening: [
      "Good evening, {name}. How was the day?",
      "Evening, {name}. Time to settle in.",
      "Hello, {name}. The day can end softly.",
    ],
    night: [
      "Winding down, {name}? One small thing before bed.",
      "Late one, {name}. Be gentle with yourself.",
      "Goodnight is close, {name}. No rush.",
    ],
  },

  /* Daily question flow */
  dailyQuestion: {
    answerHint: "Write it however it comes. Nobody sees it until you're both done.",
    submitted: [
      "Your answer is safe. We'll show both once {partner} is ready.",
      "Sealed and waiting. No peeking from anyone.",
      "Done on your side. {partner} is still thinking.",
      "Take a breath. The reveal happens when you're both ready.",
    ],
    partnerDone: "{partner} has answered",
    partnerNotDone: "{partner} hasn't answered yet",
    bothDone: [
      "Both answers are in. Here they come.",
      "Same question, two hearts.",
      "Read slowly. Notice what makes you smile.",
      "Now you can see each other's side.",
    ],
    reactPrompt: "Want to react or reply once?",
    swapOffer: "Not the right one today? You can swap once.",
    swapped: "Swapped. Here's a different one.",
    swapUsed: "You've used today's swap. This one will be good, we promise.",
  },

  /* "Days answered together": a gentle count that never breaks */
  daysTogether: {
    label: "{count} days answered together",
    labelOne: "1 day answered together",
    milestones: {
      1: "Your first day answering together.",
      7: "A whole week of answers together.",
      14: "Two weeks of small moments.",
      30: "A month of showing up, softly.",
      50: "Fifty days of getting to know each other.",
      100: "A hundred days answered together. Lovely.",
      365: "A year of answers. Look how much you've shared.",
    },
    welcomeBack: [
      "Welcome back. {count} days answered together so far.",
      "Good to see you both. Pick up whenever you like.",
      "No catching up needed. Today's question is ready.",
    ],
  },

  /* Appreciation notes */
  appreciation: {
    received: "{partner} wrote you a note.",
    saved: "Saved to your jar.",
    inboxEmpty: "No new notes right now. They'll appear here.",
    jarEmpty: "The jar is empty for now. A first note goes a long way.",
    hardDay: [
      "Here's a note from a while back, in case today needs it.",
      "Saved for a day like today.",
      "A reminder of something kind that was said.",
    ],
  },

  /* Micro challenges: "Not today" always carries no penalty */
  challenges: {
    done: "Done. That counts.",
    doneNote: "Want to add a note or a photo?",
    notToday: [
      "That's okay. Tomorrow's a new day.",
      "No penalty, no problem. Rest counts too.",
      "Skipped, with no strings attached.",
      "Come back whenever you feel like it.",
    ],
    longDistanceBadge: "Made for long distance",
  },

  /* Journal */
  journal: {
    entryLocked: "Your entry is locked. It'll appear next to {partner}'s once they're done.",
    pass: "Pass on this prompt",
    passed: "No problem. We'll find another.",
    autosave: "Saved as you write",
    empty: "Your shared pages will gather here.",
  },

  /* Alternating story */
  story: {
    yourTurn: "Your turn to add a paragraph.",
    theirTurn: "Waiting for {partner}'s paragraph. Take your time.",
    softDeadline: "Soft deadline: about {days} days left. No pressure.",
    finished: "A story only the two of you could write.",
    empty: "No stories yet. Start with a single line.",
  },

  /* Time capsule */
  capsule: {
    sealed: "Sealed until {date}. Only the title is visible until then.",
    unlockCeremony: [
      "It's time.",
      "Open it together.",
      "From the two of you, back then.",
      "Here's what you wanted to remember.",
    ],
    empty: "No capsules yet. Seal something for future you.",
  },

  /* Games */
  games: {
    pickPrompt: "Pick one. They've already chosen.",
    same: "Same pick. That's a good sign.",
    different: "Different picks. Worth a chat.",
    wrongGuess: "A wrong guess is just a conversation starter.",
    scoresOff: "Scores are off. Just for fun.",
    roundDone: "Round complete. Nice playing with you.",
    spicyOff: "Spicier rounds are switched off. You can turn them on together.",
    empty: "Pick a game whenever you're in the mood.",
  },

  /* Bucket list and dream board */
  bucketList: {
    statuses: { idea: "An idea", planned: "Planned", done: "Done" },
    votes: { want: "I want this too", maybe: "Maybe" },
    celebrate: [
      "Done, and it counts. Well done, you two.",
      "One more memory, made together.",
      "Another one ticked off, side by side.",
      "That one's yours forever.",
    ],
    memoryPhoto: "Add a photo to remember it by.",
    empty: "Start with one small wish.",
  },

  /* Date night */
  dateNight: {
    intro: "Here are three ideas for tonight.",
    veto: "Not feeling it? Veto one.",
    shuffle: "Shuffle",
    rate: "How was it? Rate your date from 1 to 5.",
    noMatch: "Nothing quite fits. Try loosening one filter.",
  },

  /* Reminders (push and email). Warm, short, never nagging */
  reminders: {
    dailyQuestion: [
      "A small question is waiting for you two.",
      "One minute for the two of you?",
      "Today's question is ready. No rush.",
    ],
    story: [
      "Your story is waiting for a paragraph, whenever you're ready.",
      "It's your turn in the story.",
    ],
    capsule: [
      "A time capsule opens today.",
      "Something you sealed is ready to open.",
    ],
    note: "{partner} left you a note.",
  },

  /* Empty states and waiting moments */
  loading: [
    "Warming up the questions…",
    "Finding something good to ask…",
    "Setting the table for two…",
    "Putting the kettle on…",
    "Shuffling the cards, gently…",
    "Dusting off the good memories…",
  ],
  soloMode: "You're here first. Invite {partner} whenever you're ready.",
  waitingForPartner: "Waiting for {partner} to join. Meanwhile, the questions are yours.",

  /* Footer */
  disclaimer: "Twologue is not therapy and not a crisis service.",
};

/* ---------- Everything in one object, for convenience ---------- */

export const DICTIONARY = {
  dailyQuestions: DAILY_QUESTIONS,
  appreciation: APPRECIATION,
  challenges: CHALLENGES,
  journalPrompts: JOURNAL_PROMPTS,
  storyStarters: STORY_STARTERS,
  capsuleOccasions: CAPSULE_OCCASIONS,
  capsulePrompts: CAPSULE_PROMPTS,
  knowMeTemplates: KNOW_ME_TEMPLATES,
  knowMeQuestions: KNOW_ME_QUESTIONS,
  quickGames: QUICK_GAMES,
  twoTruths: TWO_TRUTHS,
  bucketIdeas: BUCKET_IDEAS,
  dreamBoardPrompts: DREAM_BOARD_PROMPTS,
  dateIdeas: DATE_IDEAS,
  voice: VOICE,
};
