interface ServerlessRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
}

interface ServerlessResponse {
  status: (code: number) => ServerlessResponse;
  setHeader: (name: string, value: string) => void;
  json: (body: unknown) => void;
}

const LTA_BUS_ARRIVAL_V3_ENDPOINT =
  'https://datamall2.mytransport.sg/ltaodataservice/v3/BusArrival';

const BUS_STOP_CODE_REGEX = /^\d{5}$/;
const SERVICE_NO_REGEX = /^[A-Za-z0-9]{1,6}$/;

function getSingleQueryParam(
  query: Record<string, string | string[] | undefined>,
  keys: string[]
): string {
  for (const key of keys) {
    const val = query[key];
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
    if (Array.isArray(val) && typeof val[0] === 'string' && val[0].trim().length > 0) {
      return val[0].trim();
    }
  }
  return '';
}

export default async function handler(req: ServerlessRequest, res: ServerlessResponse) {
  if (req.method && req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const accountKey = process.env.LTA_ACCOUNT_KEY?.trim();
  if (!accountKey) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).json({
      error: 'LTA_ACCOUNT_KEY environment variable is not configured on the server.',
      code: 'MISSING_API_KEY',
    });
  }

  const busStopCode = getSingleQueryParam(req.query, ['BusStopCode', 'busStopCode']);
  if (!BUS_STOP_CODE_REGEX.test(busStopCode)) {
    return res.status(400).json({
      error: 'Invalid or missing BusStopCode. Expected a 5-digit Singapore bus stop code (e.g. 04121).',
      code: 'INVALID_BUS_STOP_CODE',
    });
  }

  const serviceNo = getSingleQueryParam(req.query, ['ServiceNo', 'serviceNo']);
  if (serviceNo && !SERVICE_NO_REGEX.test(serviceNo)) {
    return res.status(400).json({
      error: 'Invalid ServiceNo format.',
      code: 'INVALID_SERVICE_NO',
    });
  }

  const upstreamUrl = new URL(LTA_BUS_ARRIVAL_V3_ENDPOINT);
  upstreamUrl.searchParams.set('BusStopCode', busStopCode);
  if (serviceNo) {
    upstreamUrl.searchParams.set('ServiceNo', serviceNo);
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method: 'GET',
      headers: {
        AccountKey: accountKey,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!upstreamResponse.ok) {
      res.setHeader('Cache-Control', 'no-store');
      if (upstreamResponse.status === 401 || upstreamResponse.status === 403) {
        return res.status(502).json({
          error: 'LTA DataMall rejected the AccountKey credentials.',
          code: 'UPSTREAM_AUTH_ERROR',
        });
      }
      return res.status(502).json({
        error: `LTA DataMall upstream returned HTTP ${upstreamResponse.status}.`,
        code: 'UPSTREAM_HTTP_ERROR',
      });
    }

    const payload = await upstreamResponse.json();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(payload);
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    const isTimeout = err instanceof Error && err.name === 'TimeoutError';
    return res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? 'Timed out waiting for LTA DataMall v3 response.'
        : 'Unable to reach LTA DataMall v3 service.',
      code: isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FETCH_ERROR',
    });
  }
}
