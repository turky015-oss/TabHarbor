import { defaults, type State } from "./model";
export async function read(): Promise<State> {
  const { tabharbor } = await chrome.storage.local.get("tabharbor");
  if (!tabharbor) return defaults();
  if ((tabharbor as State).schemaVersion !== 1) throw Error("schema");
  return tabharbor as State;
}
export async function write(state: State): Promise<void> {
  try {
    await chrome.storage.local.set({ tabharbor: state });
  } catch {
    throw Error("storage");
  }
}
