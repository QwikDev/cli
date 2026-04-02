export type Joke = [setup: string, punchline: string];

export const JOKES: Joke[] = [
  ["Why do programmers prefer dark mode?", "Because light attracts bugs!"],
  [
    "How many programmers does it take to change a light bulb?",
    "None, that's a hardware problem.",
  ],
  [
    "Why do Java developers wear glasses?",
    "Because they can't C#.",
  ],
  [
    "What's a programmer's favorite hangout place?",
    "Foo Bar.",
  ],
  [
    "Why was the JavaScript developer sad?",
    "Because he didn't Node how to Express himself.",
  ],
  [
    "What did the router say to the doctor?",
    "It hurts when IP.",
  ],
  [
    "Why did the developer go broke?",
    "Because he used up all his cache.",
  ],
  [
    "What's the object-oriented way to become wealthy?",
    "Inheritance.",
  ],
  [
    "Why do programmers always mix up Halloween and Christmas?",
    "Because Oct 31 equals Dec 25.",
  ],
  [
    "What do you call a programmer from Finland?",
    "Nerdic.",
  ],
];

export function getRandomJoke(): Joke {
  const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
  if (!joke) {
    return ["Why do programmers prefer dark mode?", "Because light attracts bugs!"];
  }
  return joke;
}
