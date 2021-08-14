import { getRandomColor } from "@/functions/utils";
import { usePresenceList, useUpdatePresence } from "@/hooks/usePresence";
import { useRoomList } from "@/hooks/useRoomState";
import { useSocketEmit } from "@/hooks/useSocketConnection";
import { Button, Center, chakra, Input, SimpleGrid, Stack } from "@chakra-ui/react";
import { getRandomString } from "@pastable/core";
import { useRef } from "react";
import { LiveCursorsWithRefs } from "./LiveCursors";
import { PlayerList } from "./PlayerList";
import { PresenceName } from "./PresenceName";

// TODO proxy+permission xxx.push() emit/throw etc

export const Demo = () => {
    const setPresence = useUpdatePresence();
    const updateRandomColor = () => setPresence((player) => ({ ...player, color: getRandomColor() }));

    const emit = useSocketEmit();
    const createRoom = () => emit("room.create#" + inputRef.current.value);
    const joinRoom = () => emit("room.join#" + inputRef.current.value);
    const updateRoom = () => emit("room.update#" + inputRef.current.value, { id: getRandomString() });

    const roomList = useRoomList();
    const inputRef = useRef<HTMLInputElement>();

    const presenceList = usePresenceList();
    console.log(presenceList);

    return (
        <Stack w="100%">
            <Center flexDir="column" m="8">
                <Stack h="100%">
                    <Stack direction="row" alignItems="center">
                        <chakra.span>(Editable) Username: </chakra.span>
                        <PresenceName />
                    </Stack>
                    <Button onClick={updateRandomColor}>Random color</Button>
                    <Button onClick={createRoom}>New room</Button>
                    <Button onClick={() => emit("room.create#" + getRandomString())}>New random room</Button>
                    <Stack direction="row">
                        <Input ref={inputRef} defaultValue="oui" />
                        <Button onClick={joinRoom}>Join room</Button>
                    </Stack>
                    <Button onClick={updateRoom}>Update state</Button>
                    <Button onClick={() => emit("relay", "everyone")}>relay</Button>
                    <Button onClick={() => emit("broadcast", "not me")}>broadcast</Button>
                </Stack>
            </Center>
            <SimpleGrid columns={[1, 1, 2, 3, 3, 4]} w="100%" spacing="8">
                {roomList.map(
                    (room, index) =>
                        null
                        // <GameRoom key={room.id} room={rooms[index]} rooms={rooms} />
                )}
            </SimpleGrid>
            <PlayerList />
            <LiveCursorsWithRefs />
        </Stack>
    );
};
