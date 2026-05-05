import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { commandExists, run } from "../utils/shell.js";

export interface SelectItem {
  id: string;
  label: string;
}

export async function selectItem(items: SelectItem[]): Promise<SelectItem | undefined> {
  if (items.length === 0) return undefined;
  if (commandExists("fzf")) {
    const inputText = items.map((item) => `${item.id}\t${item.label}`).join("\n");
    const result = await run("fzf", ["--with-nth=2..", "--delimiter=\t"], { input: inputText, allowFailure: true });
    const id = result.stdout.split("\t")[0]?.trim();
    return items.find((item) => item.id === id);
  }
  console.log("fzf not found; using basic selection. Install fzf for a better picker.");
  items.slice(0, 30).forEach((item, index) => console.log(`${index + 1}. ${item.label}`));
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question("Choose a memo number: ");
    const index = Number(answer) - 1;
    return items[index];
  } finally {
    rl.close();
  }
}

export async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question(`${message} [y/N] `)).trim().toLowerCase();
    return answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}
