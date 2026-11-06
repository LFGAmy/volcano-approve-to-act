import { VolcanoAuth } from '@volcano.dev/sdk';

// Browser client. Reads the two public values the build inlines. Never the
// service key: the SDK refuses one in a browser, and nothing here needs it.
export function volcanoEnv(): { apiUrl: string; anonKey: string } {
  const apiUrl = process.env.NEXT_PUBLIC_VOLCANO_API_URL;
  const anonKey = process.env.NEXT_PUBLIC_VOLCANO_ANON_KEY;
  if (!apiUrl || !anonKey) {
    throw new Error(
      'Set NEXT_PUBLIC_VOLCANO_API_URL and NEXT_PUBLIC_VOLCANO_ANON_KEY (names are in volcano/volcano.env.example).',
    );
  }
  return { apiUrl, anonKey };
}

let client: VolcanoAuth | null = null;

export function getVolcano(): VolcanoAuth {
  if (!client) {
    const { apiUrl, anonKey } = volcanoEnv();
    client = new VolcanoAuth({ apiUrl, anonKey });
  }
  return client;
}
