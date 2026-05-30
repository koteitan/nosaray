import { LinkIcon } from "@chakra-ui/icons";
import { Box, Flex, HStack, Text } from "@chakra-ui/react";
import { useAtomValue } from "jotai";
import { type PostQuery, usePostIds } from "../states/Posts";
import { useOngoingWaybackQuery, waybackQueryInputsAtom } from "../states/WaybackQuery";
import { WaybackQuery, WaybackQueryInputs } from "../types/WaybackQuery";
import { useDarkAware } from "../utils/darkmode";
import { CopyNeventsButton } from "./CopyNeventsButton";
import { CopyToClipboardButton } from "./CopyToClipboardButton";
import { Post } from "./Post";

type PostTimelineProps = {
  postQuery: PostQuery;
};

const shareLinkFromQueryInputs = (qin: WaybackQueryInputs | undefined): string => {
  const url = new URL(location.href);
  if (qin) {
    url.search = WaybackQueryInputs.toURLQuery(qin);
  } else {
    url.search = "";
  }
  return url.toString();
};

export const PostTimeline: React.FC<PostTimelineProps> = ({ postQuery }) => {
  const ongoingWaybackQuery = useOngoingWaybackQuery();
  const qin = useAtomValue(waybackQueryInputsAtom);
  const linkIconColor = useDarkAware("gray.500");

  const postIds = usePostIds(postQuery);
  const isAsc = postQuery.order === "created-at-asc";
  const topLabel = isAsc ? "↑古" : "↑新";
  const bottomLabel = isAsc ? "↓新" : "↓古";

  return (
    <Flex position="relative" w="100%" direction="column" gap={1}>
      {ongoingWaybackQuery && (
        <>
          <HStack alignItems="baseline" alignSelf="start">
            <Text fontSize="2xl" fontWeight="bold">
              Result
            </Text>
            <Text fontSize="sm">{isAsc ? "↑古 ↓新" : "↑新 ↓古"}</Text>
            <Text>{WaybackQuery.format(ongoingWaybackQuery)}</Text>
            <Box alignSelf="center">
              <CopyToClipboardButton
                valueToCopy={shareLinkFromQueryInputs(qin)}
                tooltip={{ label: "共有リンクをコピー", placement: "top" }}
              >
                <LinkIcon color={linkIconColor} />
              </CopyToClipboardButton>
            </Box>
          </HStack>
          <Box
            position="fixed"
            top={4}
            left={4}
            bg="gray.700"
            color="white"
            px={3}
            py={1}
            borderRadius="md"
            fontWeight="bold"
            zIndex={1000}
            pointerEvents="none"
          >
            {topLabel}
          </Box>
          <Box
            position="fixed"
            bottom={4}
            left={4}
            bg="gray.700"
            color="white"
            px={3}
            py={1}
            borderRadius="md"
            fontWeight="bold"
            zIndex={1000}
            pointerEvents="none"
          >
            {bottomLabel}
          </Box>
        </>
      )}
      {postIds.map((id) => (
        <Post key={id} id={id} />
      ))}
      <CopyNeventsButton position="fixed" bottom="16px" ml="876px" size="lg" colorScheme="purple" isRound />
    </Flex>
  );
};
