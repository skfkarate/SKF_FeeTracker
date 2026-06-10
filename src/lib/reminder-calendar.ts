export type PosterCalendarEvent = {
  id: string;
  name: string;
  month: number;
  day: number;
  category: string;
  notes: string;
};

export const POSTER_EVENTS = [
  { id: "new-year", name: "New Year", month: 0, day: 1, category: "Celebration", notes: "Happy New Year poster" },
  { id: "republic-day", name: "Republic Day", month: 0, day: 26, category: "National", notes: "National flag / patriotic poster" },
  { id: "ramadan-begins", name: "Ramadan Begins", month: 2, day: 1, category: "Festival", notes: "Greetings poster" },
  { id: "womens-day", name: "Women's Day", month: 2, day: 8, category: "Awareness", notes: "Women empowerment poster" },
  { id: "ugadi", name: "Ugadi", month: 2, day: 29, category: "Festival", notes: "Telugu/Kannada New Year" },
  { id: "eid-ul-fitr", name: "Eid ul-Fitr", month: 2, day: 31, category: "Festival", notes: "Eid greetings poster" },
  { id: "ambedkar-jayanti", name: "Ambedkar Jayanti", month: 3, day: 14, category: "National", notes: "Tribute poster" },
  { id: "may-day", name: "May Day", month: 4, day: 1, category: "Awareness", notes: "Labour Day" },
  { id: "eid-ul-adha", name: "Eid ul-Adha", month: 5, day: 7, category: "Festival", notes: "Bakrid greetings" },
  { id: "international-yoga-day", name: "International Yoga Day", month: 5, day: 21, category: "Sports", notes: "Yoga & fitness poster" },
  { id: "independence-day", name: "Independence Day", month: 7, day: 15, category: "National", notes: "Tricolor / patriotic poster" },
  { id: "janmashtami", name: "Janmashtami", month: 7, day: 25, category: "Festival", notes: "Krishna Jayanti" },
  { id: "national-sports-day", name: "National Sports Day", month: 7, day: 29, category: "Sports", notes: "Dhyan Chand tribute & sports poster" },
  { id: "teachers-day", name: "Teachers' Day", month: 8, day: 5, category: "Awareness", notes: "Guru tribute poster" },
  { id: "ganesh-chaturthi", name: "Ganesh Chaturthi", month: 8, day: 7, category: "Festival", notes: "Ganpati poster" },
  { id: "gandhi-jayanti", name: "Gandhi Jayanti", month: 9, day: 2, category: "National", notes: "Mahatma Gandhi tribute" },
  { id: "dasara-dussehra", name: "Dasara / Dussehra", month: 9, day: 12, category: "Festival", notes: "Victory of good poster" },
  { id: "world-karate-day", name: "World Karate Day", month: 9, day: 25, category: "Sports", notes: "Karate poster - MUST DO" },
  { id: "diwali", name: "Diwali", month: 10, day: 1, category: "Festival", notes: "Festival of lights poster" },
  { id: "childrens-day", name: "Children's Day", month: 10, day: 14, category: "Awareness", notes: "Chacha Nehru / kids poster" },
  { id: "guru-nanak-jayanti", name: "Guru Nanak Jayanti", month: 10, day: 15, category: "Festival", notes: "Greetings poster" },
  { id: "christmas", name: "Christmas", month: 11, day: 25, category: "Festival", notes: "Christmas greetings poster" },
] as const satisfies readonly PosterCalendarEvent[];
