// Rotates one quote per day (index = day-of-year % length), so every user in
// an organization sees the same quote on a given day and it changes daily.
export const DAILY_QUOTES: string[] = [
  "Ilmu nur, jaholat zulmat. (Knowledge is light, ignorance is darkness.)",
  "O'qish — kelajak kaliti. (Reading is the key to the future.)",
  "Education is the most powerful weapon which you can use to change the world. — Nelson Mandela",
  "The beautiful thing about learning is that no one can take it away from you. — B.B. King",
  "O'qituvchi kelajakni yaratadi. (A teacher creates the future.)",
  "Bilim — behisob boylik. (Knowledge is immeasurable wealth.)",
  "The roots of education are bitter, but the fruit is sweet. — Aristotle",
  "Har bir bola — kelajak quyoshi. (Every child is the sun of the future.)",
  "Education is not preparation for life; education is life itself. — John Dewey",
  "Mehnat qilmasdan turib rohat yo'q. (There is no comfort without effort.)",
  "The expert in anything was once a beginner.",
  "Bilim olish beshikdan qabrgacha davom etadi. (Learning continues from cradle to grave.)",
  "Live as if you were to die tomorrow. Learn as if you were to live forever. — Mahatma Gandhi",
  "O'qituvchi — ikkinchi ota-ona. (A teacher is a second parent.)",
  "The function of education is to teach one to think intensively and to think critically. — Martin Luther King Jr.",
  "Sabr va mehnat — muvaffaqiyat kaliti. (Patience and effort are the keys to success.)",
  "An investment in knowledge pays the best interest. — Benjamin Franklin",
  "Yaxshi niyat — yarim davlat. (A good intention is half the fortune.)",
  "Tomorrow belongs to those who prepare for it today. — Malcolm X",
  "Bilim - kuch, mehnat - baxt. (Knowledge is power, effort is happiness.)",
];

export function getQuoteOfTheDay(date = new Date()): string {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start;
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length];
}
