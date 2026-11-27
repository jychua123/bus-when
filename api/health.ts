export interface ServerlessRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
}

export interface ServerlessResponse {
  status: (code: number) => ServerlessResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
}

export default function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const ltaAccountKey = process.env.LTA_ACCOUNT_KEY?.trim();
  const keyConfigured = Boolean(ltaAccountKey && ltaAccountKey.length > 0);

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    status: 'ok',
    service: 'sg-bustime-api',
    ltaApiVersion: 'v3',
    ltaAccountKeyConfigured: keyConfigured,
    refreshIntervalSeconds: 20,
    timestamp: new Date().toISOString(),
  });
}
