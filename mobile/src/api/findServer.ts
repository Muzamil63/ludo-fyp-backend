// Finds where the Ludo backend is, so a real phone works without typing the address by hand.
import { TurboModuleRegistry, type TurboModule } from 'react-native';
import { DEFAULT_SERVER_URL, SERVER_PORT } from '../config';

interface SourceCode extends TurboModule {
  getConstants: () => { scriptURL?: string };
}

// A debug app downloads its code from Metro, which runs on the same PC as the backend. So Metro's
// address is the PC's address: "localhost" (USB), "10.0.2.2" (emulator) or the PC's Wi-Fi IP.
export function pcServerUrl(): string | null {
  try {
    const scriptURL = TurboModuleRegistry.get<SourceCode>('SourceCode')?.getConstants().scriptURL;
    const host = scriptURL?.match(/^https?:\/\/([^:/]+)/)?.[1]; // e.g. "192.168.1.4"
    return host ? `http://${host}:${SERVER_PORT}` : null;
  } catch {
    return null; // release build: the code is inside the app, there is no Metro
  }
}

// True when the Ludo backend answers /api/health at this address (gives up after 2.5 s).
async function isUp(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(`${url}/api/health`, { signal: controller.signal });
    return (await res.json()).success === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Tries the saved address first, then the usual ones (all at the same time, so it is quick).
// Returns the first address where the backend answers, or null when none answers.
export async function findServer(saved: string | null): Promise<string | null> {
  const candidates = [saved, pcServerUrl(), `http://localhost:${SERVER_PORT}`, DEFAULT_SERVER_URL]
    .filter((url, i, all): url is string => !!url && all.indexOf(url) === i);
  const up = await Promise.all(candidates.map(isUp));
  return candidates.find((_, i) => up[i]) ?? null;
}
