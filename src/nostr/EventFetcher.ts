import { type FetchTimeRangeFilter, type NostrEvent, NostrFetcher, eventKind } from "nostr-fetch";
import type { NostrProfileWithMeta } from "../types/NostrProfile";
import type { RelayList } from "../types/RelayList";
import { parseNostrProfile } from "./ProfileParser";

const fetcher = NostrFetcher.init({ minLogLevel: "info" });

// bootstrap relays for discovering kind:10002 (relay list), profiles, and one-off event lookups.
// these are NOT mixed into kind:1 timeline fetches once the user's relay list is known.
const bootstrapRelays = [
  "wss://directory.yabu.me",
  "wss://purplepag.es",
  "wss://relay.nostr.band",
  "wss://indexer.coracle.social",
];

const relaysWithBootstraps = (relayUrls: string[]) => [...relayUrls, ...bootstrapRelays];

export class EventFetcher {
  public static async fetchSingleProfile(
    pubkey: string,
    relayUrls: string[],
  ): Promise<NostrProfileWithMeta | undefined> {
    const ev = await fetcher.fetchLastEvent(relaysWithBootstraps(relayUrls), {
      authors: [pubkey],
      kinds: [eventKind.metadata],
    });
    if (ev === undefined) {
      return undefined;
    }

    const profile = parseNostrProfile(ev.content);
    return profile ? { ...profile, pubkey: ev.pubkey, created_at: ev.created_at } : undefined;
  }

  public static async *fetchProfiles(pubkeys: string[], relayUrls: string[]): AsyncIterable<NostrProfileWithMeta> {
    const evIter = fetcher.allEventsIterator(
      relaysWithBootstraps(relayUrls),
      { authors: pubkeys, kinds: [eventKind.metadata] },
      {},
    );

    for await (const ev of evIter) {
      const profile = parseNostrProfile(ev.content);
      if (!profile) {
        continue;
      }
      yield { ...profile, pubkey: ev.pubkey, created_at: ev.created_at };
    }
  }

  public static async fetchFollowAndRelayList(
    pubkey: string,
    relayUrls: string[],
  ): Promise<{ followList: string[]; relayList: RelayList }> {
    const [k3, k10002] = await Promise.all(
      [eventKind.contacts, eventKind.relayList].map(async (kind) =>
        fetcher.fetchLastEvent(relaysWithBootstraps(relayUrls), {
          authors: [pubkey],
          kinds: [kind],
        }),
      ),
    );

    const followList = k3 ? k3.tags.filter((t) => t.length >= 2 && t[0] === "p").map((t) => t[1] as string) : [];

    const relayList = pickRelayList(k3, k10002);

    return { followList, relayList };
  }

  public static async fetchEventById(eventId: string, relayUrls: string[]): Promise<NostrEvent | undefined> {
    return await fetcher.fetchLastEvent(relaysWithBootstraps(relayUrls), {
      ids: [eventId],
    });
  }

  public static async *fetchTextNotes(
    pubkeys: string[],
    timeRangeFilter: FetchTimeRangeFilter,
    relayUrls: string[],
  ): AsyncIterable<NostrEvent> {
    // kind:1 search uses only the user's relay list (no bootstrap relays)
    const evIter = fetcher.allEventsIterator(
      relayUrls,
      { authors: pubkeys, kinds: [eventKind.text] },
      timeRangeFilter,
    );
    for await (const ev of evIter) {
      if (ev.kind === eventKind.text) {
        yield ev;
      }
    }
  }
}

// fallback relays used when both kind:10002 and kind:3 are absent (or empty)
const fallbackRelays = ["wss://relay.nostr.band", "wss://yabu.me", "wss://purplepag.es"];

const fallbackRelayList = (): RelayList =>
  Object.fromEntries(fallbackRelays.map((url) => [url, { read: true, write: true }]));

// priority: kind:10002 > kind:3 > fallback. kind:3 is NOT consulted when kind:10002 is present.
const pickRelayList = (k3: NostrEvent | undefined, k10002: NostrEvent | undefined): RelayList => {
  if (k10002 !== undefined) {
    const list = parseRelayListInKind10002(k10002);
    if (Object.keys(list).length > 0) return list;
  }
  if (k3 !== undefined) {
    const list = parseRelayListInKind3(k3);
    if (Object.keys(list).length > 0) return list;
  }
  return fallbackRelayList();
};

const parseRelayListInKind3 = (ev: NostrEvent): RelayList => {
  try {
    return JSON.parse(ev.content) as RelayList; // TODO: schema validation
  } catch (err) {
    console.error("failed to parse kind 3 event:", err);
    return {};
  }
};

const parseRelayListInKind10002 = (ev: NostrEvent): RelayList => {
  const res: RelayList = {};

  for (const t of ev.tags.filter((t) => t.length >= 2 && t[0] === "r")) {
    const [, url, relayType] = t as [string, string, string | undefined];

    if (relayType === undefined) {
      res[url] = { read: true, write: true };
    } else {
      switch (relayType) {
        case "read":
          res[url] = { read: true, write: false };
          break;
        case "write":
          res[url] = { read: false, write: true };
          break;
        default:
          console.warn("invalid relay type in kind 10002 event:", relayType);
      }
    }
  }
  return res;
};
