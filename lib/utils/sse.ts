export interface ParsedServerSentEvent {
  event?: string;
  data: string;
}

function parseServerSentEvent(rawEvent: string): ParsedServerSentEvent | null {
  const trimmedEvent = rawEvent.trim();

  if (!trimmedEvent) {
    return null;
  }

  let eventName: string | undefined;
  const dataLines: string[] = [];

  for (const line of trimmedEvent.split("\n")) {
    if (line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("event:")) {
      eventName = line.slice("event:".length).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return {
    event: eventName,
    data: dataLines.join("\n"),
  };
}

export async function* readServerSentEvents(
  stream: ReadableStream<Uint8Array>,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      let boundaryIndex = buffer.indexOf("\n\n");
      while (boundaryIndex >= 0) {
        const rawEvent = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(boundaryIndex + 2);

        const event = parseServerSentEvent(rawEvent);
        if (event) {
          yield event;
        }

        boundaryIndex = buffer.indexOf("\n\n");
      }
    }

    buffer += decoder.decode();
    const trailingEvent = parseServerSentEvent(buffer);
    if (trailingEvent) {
      yield trailingEvent;
    }
  } finally {
    reader.releaseLock();
  }
}

export function encodeServerSentEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}
