import { atom, getDefaultStore, useAtomValue } from "jotai";
import { loadable } from "jotai/utils";
import { EventFetcher } from "../nostr/EventFetcher";
import { getReadRelays } from "../nostr/utils";
import type { UserData } from "../types/UserData";
import { WaybackQuery, WaybackQueryInputs } from "../types/WaybackQuery";
import { startFetchingPosts } from "./Posts";
import { myDataAtom } from "./Profiles";

const store = getDefaultStore();

export const waybackQueryInputsAtom = atom<WaybackQueryInputs | undefined>(
  WaybackQueryInputs.fromURLQuery(location.search),
);

export const clearWaybackQueryInputs = () => {
  store.set(waybackQueryInputsAtom, undefined);
};

// cache of resolved event created_at, keyed by event hex id
export const eventCreatedAtCacheAtom = atom<Record<string, number>>({});

const ongoingWaybackQueryAtom = atom<WaybackQuery | undefined>((get) => {
  const inputs = get(waybackQueryInputsAtom);
  if (inputs === undefined) return undefined;
  const cache = get(eventCreatedAtCacheAtom);
  return WaybackQuery.fromInputs(inputs, (id) => cache[id]);
});

export const useOngoingWaybackQuery = () => {
  const query = useAtomValue(ongoingWaybackQueryAtom);
  return query;
};

const ongoingQueryWithMyDataAtom = atom<{
  query?: WaybackQuery;
  myData?: UserData;
}>((get) => {
  const myDataLoadable = get(loadable(myDataAtom));
  if (myDataLoadable.state === "hasData") {
    return { query: get(ongoingWaybackQueryAtom), myData: myDataLoadable.data };
  }
  return {};
});

const replaceURLQueryStr = (queryStr: string) => {
  const url = new URL(location.href);
  url.search = queryStr;
  history.replaceState(null, "", url);
};

store.sub(ongoingQueryWithMyDataAtom, async () => {
  const { query, myData } = store.get(ongoingQueryWithMyDataAtom);
  const inputs = store.get(waybackQueryInputsAtom);

  replaceURLQueryStr(inputs ? WaybackQueryInputs.toURLQuery(inputs) : "");

  if (query !== undefined && myData !== undefined) {
    await startFetchingPosts(query);
  }
  // TODO: cancel fetching posts if `query` is reset to undefined
});

// auto-resolve event-and-around: fetch the referenced event and cache its created_at
const pendingResolves = new Set<string>();
const myDataForEventResolveAtom = atom((get) => {
  const myDataLoadable = get(loadable(myDataAtom));
  return myDataLoadable.state === "hasData" ? myDataLoadable.data : undefined;
});

store.sub(waybackQueryInputsAtom, () => {
  const inputs = store.get(waybackQueryInputsAtom);
  if (inputs?.type !== "event-and-around") return;
  const eventId = inputs.eventId;
  const cache = store.get(eventCreatedAtCacheAtom);
  if (cache[eventId] !== undefined) return;
  if (pendingResolves.has(eventId)) return;

  const myData = store.get(myDataForEventResolveAtom);
  if (myData === undefined) return;
  const relays = myData.relayList ? getReadRelays(myData.relayList) : [];

  pendingResolves.add(eventId);
  EventFetcher.fetchEventById(eventId, relays)
    .then((ev) => {
      if (ev !== undefined) {
        const cur = store.get(eventCreatedAtCacheAtom);
        store.set(eventCreatedAtCacheAtom, { ...cur, [eventId]: ev.created_at });
      } else {
        console.warn("event-and-around: event not found:", eventId);
      }
    })
    .catch((err) => {
      console.error("event-and-around: fetch failed:", err);
    })
    .finally(() => {
      pendingResolves.delete(eventId);
    });
});

store.sub(myDataForEventResolveAtom, () => {
  // re-trigger when user data becomes available
  const inputs = store.get(waybackQueryInputsAtom);
  if (inputs?.type === "event-and-around") {
    // bump the atom to trigger the resolver above
    store.set(waybackQueryInputsAtom, { ...inputs });
  }
});
