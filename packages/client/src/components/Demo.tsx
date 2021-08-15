import { getRandomColor } from "@/functions/utils";
import { usePresenceList, useUpdatePresence } from "@/hooks/usePresence";
import { useRoomList } from "@/hooks/useRoomState";
import { useSocketClient } from "@/hooks/useSocketClient";
import { Button, Center, chakra, Input, SimpleGrid, Stack, useColorMode } from "@chakra-ui/react";
import { getRandomString } from "@pastable/core";
import { useRef } from "react";
import { LobbyRoom } from "./LobbyRoom";
import { PlayerList } from "./PlayerList";
import { PresenceName } from "./PresenceName";

// TODO proxy+permission xxx.push() emit/throw etc
const initialRoomState = { status: "waiting" };
export const Demo = () => {
    const setPresence = useUpdatePresence();
    const updateRandomColor = () => setPresence((player) => ({ ...player, color: getRandomColor() }));

    const client = useSocketClient();
    const createRoom = () => client.rooms.create(inputRef.current.value, initialRoomState);
    const joinRoom = () => client.rooms.join(inputRef.current.value);

    const roomList = useRoomList();
    const inputRef = useRef<HTMLInputElement>();
    const { toggleColorMode } = useColorMode();

    // const presenceList = usePresenceList();

    return (
        <Stack w="100%">
            <Center flexDir="column" m="8">
                <Stack h="100%">
                    <Stack direction="row" alignItems="center">
                        <Button onClick={updateRandomColor}>Random color</Button>
                        <chakra.span>Username: </chakra.span>
                        <PresenceName />
                    </Stack>
                    <Button onClick={createRoom}>New room</Button>
                    <Button onClick={() => client.rooms.create(getRandomString(), initialRoomState)}>
                        New random room
                    </Button>
                    <Stack direction="row">
                        <Input ref={inputRef} defaultValue="oui" />
                        <Button onClick={joinRoom}>Join room</Button>
                    </Stack>
                    <Button onClick={toggleColorMode}>Toggle color mode</Button>
                </Stack>
            </Center>
            <SimpleGrid columns={[1, 1, 2, 3, 3, 4]} w="100%" spacing="8">
                {roomList.map((room) => (
                    <LobbyRoom key={room.name} availableRoom={room} />
                ))}
            </SimpleGrid>
            <PlayerList />
            {/* <LiveCursorsWithRefs /> */}
        </Stack>
    );
};
