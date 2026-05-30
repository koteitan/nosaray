import { decode } from "nostr-tools/nip19";

export type ParsedEventInput = {
  hexId: string;
  relayHints: string[];
};

// Accepts a 64-char hex, a note1... (bech32 id only), or a nevent1... (bech32 with optional relay hints).
// Returns the canonical hex id and any relay hints embedded in nevent1.
export const parseEventInput = (input: string): ParsedEventInput | undefined => {
  const trimmed = input.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return { hexId: trimmed.toLowerCase(), relayHints: [] };
  }
  if (trimmed.startsWith("note1") || trimmed.startsWith("nevent1")) {
    try {
      const decoded = decode(trimmed);
      if (decoded.type === "note") return { hexId: decoded.data, relayHints: [] };
      if (decoded.type === "nevent") {
        return { hexId: decoded.data.id, relayHints: decoded.data.relays ?? [] };
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
};
