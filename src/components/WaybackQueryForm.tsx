import { RepeatClockIcon } from "@chakra-ui/icons";
import {
  Button,
  HStack,
  Input,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from "@chakra-ui/react";
import { SingleDatepicker } from "chakra-dayzed-datepicker";
import { addMinutes, differenceInMilliseconds, format, getUnixTime, parseISO, startOfMinute, subHours } from "date-fns";
import { useAtomValue, useSetAtom } from "jotai";
import { decode } from "nostr-tools/nip19";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { eventCreatedAtCacheAtom, waybackQueryInputsAtom } from "../states/WaybackQuery";
import type { TimeUnit } from "../types/TimeUnit";
import { WaybackQuery, WaybackQueryInputs } from "../types/WaybackQuery";

const getNow = () => new Date();

const TAB_LS_KEY = "nosaray-tab";

const jaDayNames = "日月火水木金土".split("");
const jaMonthNames = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => `${i}月`);

const formatQueryFromInputs = (i: WaybackQueryInputs | undefined, cache: Record<string, number>): string => {
  if (i === undefined) {
    return "入力中...";
  }
  const q = WaybackQuery.fromInputs(i, (id) => cache[id]);
  if (q === undefined) {
    if (i.type === "event-and-around") {
      return "イベント取得中...";
    }
    return "入力中...";
  }
  return WaybackQuery.format(q);
};

const toEventHexId = (input: string): string | undefined => {
  const trimmed = input.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  if (trimmed.startsWith("note1") || trimmed.startsWith("nevent1")) {
    try {
      const decoded = decode(trimmed);
      if (decoded.type === "note") return decoded.data;
      if (decoded.type === "nevent") return decoded.data.id;
    } catch {
      return undefined;
    }
  }
  return undefined;
};

export const WaybackQueryForm: React.FC = () => {
  const setQueryInputs = useSetAtom(waybackQueryInputsAtom);
  const eventCache = useAtomValue(eventCreatedAtCacheAtom);

  const eventAndAroundForm = useEventAndAroundForm();
  const sinceAndDurForm = useSinceAndDurForm();
  const sinceAndUntilForm = useSinceAndUntilForm();
  const untilNowForm = useUntilNowForm();

  const tabs = [
    { key: "event-around", label: "イベント±期間", form: eventAndAroundForm, queryType: "event-and-around" as const },
    { key: "since-dur", label: "始点+期間", form: sinceAndDurForm, queryType: "since-and-dur" as const },
    { key: "since-until", label: "始点+終点", form: sinceAndUntilForm, queryType: "since-and-until" as const },
    { key: "until-now", label: "現在まで", form: untilNowForm, queryType: "until-now" as const },
  ];
  const [tabIdx, setTabIdx] = useState(() => {
    const initialInputs = WaybackQueryInputs.fromURLQuery(location.search);
    const urlIdx = tabs.findIndex((t) => t.queryType === initialInputs?.type);
    if (urlIdx >= 0) return urlIdx;
    const savedKey = localStorage.getItem(TAB_LS_KEY);
    if (savedKey) {
      const savedIdx = tabs.findIndex((t) => t.key === savedKey);
      if (savedIdx >= 0) return savedIdx;
    }
    return 0; // default: イベント±期間
  });
  const handleTabChange = (idx: number) => {
    setTabIdx(idx);
    const key = tabs[idx]?.key;
    if (key) localStorage.setItem(TAB_LS_KEY, key);
  };
  const queryInputs = tabs[tabIdx]?.form.queryInputs;

  const handleClickWayback = () => {
    if (queryInputs === undefined) {
      return;
    }
    setQueryInputs(queryInputs);
  };

  return (
    <VStack w="100%">
      <Tabs w="100%" colorScheme="purple" defaultIndex={tabIdx} onChange={handleTabChange}>
        <TabList>
          {tabs.map((t) => (
            <Tab key={t.key}>{t.label}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {tabs.map((t) => (
            <TabPanel key={t.key}>{t.form.view}</TabPanel>
          ))}
        </TabPanels>
      </Tabs>
      <Text>{formatQueryFromInputs(queryInputs, eventCache)}</Text>
      <Button colorScheme="purple" onClick={handleClickWayback} isDisabled={queryInputs === undefined}>
        <HStack>
          <RepeatClockIcon />
          <Text>遡る</Text>
        </HStack>
      </Button>
    </VStack>
  );
};

const useEventAndAroundForm = () => {
  const initial = useMemo(() => {
    const inputs = WaybackQueryInputs.fromURLQuery(location.search);
    if (inputs?.type !== "event-and-around") {
      return { eventInput: "", durationValue: 30, durationUnit: "minutes" as TimeUnit };
    }
    return {
      eventInput: inputs.eventId,
      durationValue: inputs.durationValue,
      durationUnit: inputs.durationUnit,
    };
  }, []);

  const [eventInput, setEventInput] = useState<string>(initial.eventInput);
  const [durationValue, setDurationValue] = useState<number>(initial.durationValue);
  const [durationUnit, setDurationUnit] = useState<TimeUnit>(initial.durationUnit);

  const queryInputs: WaybackQueryInputs | undefined = useMemo(() => {
    const hexId = toEventHexId(eventInput);
    if (!hexId || durationValue <= 0) return undefined;
    return {
      type: "event-and-around",
      eventId: hexId,
      durationValue,
      durationUnit,
    };
  }, [eventInput, durationValue, durationUnit]);

  const isInvalidEvent = eventInput.length > 0 && toEventHexId(eventInput) === undefined;
  const hexId = toEventHexId(eventInput);

  const handleJump = () => {
    if (!hexId) return;
    const el = document.getElementById(`post-${hexId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      console.warn("jump: post not found in timeline:", hexId);
    }
  };

  const view = (
    <HStack alignItems="center" justifyContent="center">
      <Input
        placeholder="note1... / nevent1... / hex"
        value={eventInput}
        onChange={(e) => setEventInput(e.target.value)}
        isInvalid={isInvalidEvent}
        w="280px"
      />
      <Text minW="1.5em">±</Text>
      <NumberInput
        min={1}
        max={100}
        allowMouseWheel
        value={durationValue}
        onChange={(_, n) => setDurationValue(Number.isNaN(n) ? 0 : n)}
        w="100px"
      >
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
      <Select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as TimeUnit)} w="fit-content">
        {Object.entries(durTimeUnitLabels).map(([unit, label]) => (
          <option key={unit} value={unit}>
            {label}
          </option>
        ))}
      </Select>
      <Button onClick={handleJump} isDisabled={!hexId} size="sm" variant="outline">
        ジャンプ
      </Button>
    </HStack>
  );

  return { queryInputs, view };
};

const durTimeUnitLabels: Record<TimeUnit, string> = {
  minutes: "分間",
  hours: "時間",
  days: "日間",
};

const useSinceAndDurForm = () => {
  const now = getNow();
  const [sinceDate, setSinceDate] = useState<Date>(subHours(now, 1));
  const [sinceTime, setSinceTime] = useState<string>(format(subHours(now, 1), "HH:mm"));
  const [durationValue, setDurationValue] = useState<number>(1);
  const [durationUnit, setDurationUnit] = useState<TimeUnit>("hours");

  const queryInputs: WaybackQueryInputs = useMemo(() => {
    const sinceDatetime = `${format(sinceDate, "yyyy-MM-dd")}T${sinceTime}`;
    return {
      type: "since-and-dur",
      sinceDatetime,
      durationValue,
      durationUnit,
    };
  }, [sinceDate, sinceTime, durationValue, durationUnit]);

  const view = (
    <HStack alignItems="center" justifyContent="center">
      <SingleDatepicker
        date={sinceDate}
        onDateChange={setSinceDate}
        maxDate={now}
        configs={{
          dateFormat: "yyyy/MM/dd",
          dayNames: jaDayNames,
          monthNames: jaMonthNames,
        }}
        propsConfigs={{
          inputProps: { w: "140px" },
        }}
      />
      <Input type="time" value={sinceTime} onChange={(e) => setSinceTime(e.target.value)} w="120px" />
      <Text minW="2em">から</Text>
      <NumberInput
        min={0}
        max={100}
        allowMouseWheel
        value={durationValue}
        onChange={(_, n) => setDurationValue(Number.isNaN(n) ? 0 : n)}
        w="120px"
      >
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
      <Select value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as TimeUnit)} w="fit-content">
        {Object.entries(durTimeUnitLabels).map(([unit, label]) => (
          <option key={unit} value={unit}>
            {label}
          </option>
        ))}
      </Select>
    </HStack>
  );

  return {
    queryInputs,
    view,
  };
};

const useSinceAndUntilForm = () => {
  const now = getNow();
  // biome-ignore lint/correctness/useExhaustiveDependencies: only initialize once on mount
  const initial = useMemo(() => {
    const inputs = WaybackQueryInputs.fromURLQuery(location.search);
    if (inputs?.type !== "since-and-until") {
      return { sinceDate: subHours(now, 1), untilDate: now };
    }
    const s = parseISO(inputs.sinceDatetime);
    const u = parseISO(inputs.untilDatetime);
    if (Number.isNaN(s.getTime()) || Number.isNaN(u.getTime())) {
      return { sinceDate: subHours(now, 1), untilDate: now };
    }
    return { sinceDate: s, untilDate: u };
  }, []);

  const [sinceDate, setSinceDate] = useState<Date>(initial.sinceDate);
  const [sinceTime, setSinceTime] = useState<string>(format(initial.sinceDate, "HH:mm"));
  const [untilDate, setUntilDate] = useState<Date>(initial.untilDate);
  const [untilTime, setUntilTime] = useState<string>(format(initial.untilDate, "HH:mm"));

  const queryInputs: WaybackQueryInputs | undefined = useMemo(() => {
    const sinceDatetime = `${format(sinceDate, "yyyy-MM-dd")}T${sinceTime}`;
    const untilDatetime = `${format(untilDate, "yyyy-MM-dd")}T${untilTime}`;
    return {
      type: "since-and-until",
      sinceDatetime,
      untilDatetime,
    };
  }, [sinceDate, sinceTime, untilDate, untilTime]);

  const view = (
    <VStack>
      <HStack alignItems="center" justifyContent="center">
        <SingleDatepicker
          date={sinceDate}
          onDateChange={setSinceDate}
          maxDate={now}
          configs={{
            dateFormat: "yyyy/MM/dd",
            dayNames: jaDayNames,
            monthNames: jaMonthNames,
          }}
          propsConfigs={{
            inputProps: { w: "140px" },
          }}
        />
        <Input type="time" value={sinceTime} onChange={(e) => setSinceTime(e.target.value)} w="120px" />
        <Text minW="2em">から</Text>
      </HStack>
      <HStack alignItems="center" justifyContent="center">
        <SingleDatepicker
          date={untilDate}
          onDateChange={setUntilDate}
          maxDate={now}
          configs={{
            dateFormat: "yyyy/MM/dd",
            dayNames: jaDayNames,
            monthNames: jaMonthNames,
          }}
          propsConfigs={{
            inputProps: { w: "140px" },
          }}
        />
        <Input type="time" value={untilTime} onChange={(e) => setUntilTime(e.target.value)} w="120px" />
        <Text minW="2em">まで</Text>
      </HStack>
    </VStack>
  );

  return {
    queryInputs,
    view,
  };
};

const agoTimeUnitLabels: Record<TimeUnit, string> = {
  minutes: "分",
  hours: "時間",
  days: "日",
};

const useUntilNowForm = () => {
  const [durationValue, setDurationValue] = useState<number>(1);
  const [durationUnit, setDurationUnit] = useState<TimeUnit>("hours");
  const tick = useTickOnStartOfMinute();

  const queryInputs: WaybackQueryInputs = useMemo(() => {
    void tick; // tick is only used to trigger update

    return {
      type: "until-now",
      durationValue,
      durationUnit,
    };
  }, [durationValue, durationUnit, tick]);

  const view = (
    <HStack alignItems="center" justifyContent="center">
      <NumberInput
        min={0}
        max={100}
        allowMouseWheel
        value={durationValue}
        onChange={(_, n) => setDurationValue(Number.isNaN(n) ? 0 : n)}
        w="120px"
      >
        <NumberInputField />
        <NumberInputStepper>
          <NumberIncrementStepper />
          <NumberDecrementStepper />
        </NumberInputStepper>
      </NumberInput>
      <Select w="fit-content" value={durationUnit} onChange={(e) => setDurationUnit(e.target.value as TimeUnit)}>
        {Object.entries(agoTimeUnitLabels).map(([unit, label]) => (
          <option key={unit} value={unit}>
            {label}
          </option>
        ))}
      </Select>
      <Text>前から現在まで</Text>
    </HStack>
  );

  return {
    queryInputs,
    view,
  };
};

// returns timestamp that will be updated on every start of minute.
// can be used to trigger action every minute.
const useTickOnStartOfMinute = () => {
  const [timestamp, setTimestamp] = useState(getUnixTime(getNow()));
  const timer = useRef<NodeJS.Timeout | undefined>(undefined);

  // biome-ignore lint/correctness/useExhaustiveDependencies:
  const setNextTick = useCallback(() => {
    const currTime = getNow();
    const nextTickTime = startOfMinute(addMinutes(currTime, 1));

    timer.current = setTimeout(
      () => {
        setTimestamp(getUnixTime(getNow()));
        setNextTick();
      },
      differenceInMilliseconds(nextTickTime, currTime),
    );
  }, []);

  useEffect(() => {
    setNextTick();
    return () => {
      if (timer.current !== undefined) {
        clearTimeout(timer.current);
      }
    };
  }, [setNextTick]);

  return timestamp;
};
