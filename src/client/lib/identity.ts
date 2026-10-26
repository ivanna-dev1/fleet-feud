const ID_KEY = "ff.playerId";
const NAME_KEY = "ff.name";

const ADJECTIVES = [
  "Сердитий", "Веселий", "Хитрий", "Сонний", "Бадьорий", "Мокрий",
  "Солоний", "Грізний", "Тихий", "Голодний", "Швидкий", "Ледачий",
  "Сміливий", "Чемний", "Дикий", "Пухнастий",
];

const ANIMALS = [
  "Кальмар", "Краб", "Тюлень", "Пінгвін", "Восьминіг", "Дельфін",
  "Кит", "Морж", "Окунь", "Оселедець", "Скат", "Ляскун",
  "Карась", "Бобер", "Пелікан", "Сом",
];

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the id lives only for this page load.
  }
}

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

export function randomName(): string {
  return `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
}

let memoryId: string | null = null;

export function getPlayerId(): string {
  const stored = read(ID_KEY);
  if (stored) return stored;
  if (!memoryId) {
    memoryId = crypto.randomUUID();
    write(ID_KEY, memoryId);
  }
  return memoryId;
}

export function getName(): string {
  const stored = read(NAME_KEY);
  if (stored) return stored;
  const name = randomName();
  write(NAME_KEY, name);
  return name;
}

export function setName(name: string): void {
  write(NAME_KEY, name);
}
