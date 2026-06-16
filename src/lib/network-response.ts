type ResponseWithData = {
  data?: unknown;
};

export const parseNetworkResponseData = (data: unknown): unknown => {
  if (typeof data !== 'string') {
    return data;
  }

  const text = data.trim();
  if (!text || (!text.startsWith('{') && !text.startsWith('['))) {
    return data;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return data;
  }
};

export const normalizeNetworkResponseData = <T extends ResponseWithData>(response: T): T => {
  const parsedData = parseNetworkResponseData(response.data);
  if (parsedData === response.data) {
    return response;
  }
  return {
    ...response,
    data: parsedData,
  };
};
