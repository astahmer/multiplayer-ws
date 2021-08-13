import { successToast } from "@/functions/toasts";
import { getRandomColor, getSaturedColor, makePlayer } from "@/functions/utils";
import { WsEvent } from "@/functions/ws";
import { useSocketConnection, useSocketEmit, useSocketEvent, useSocketStatus } from "@/hooks/useSocketConnection";
import { Player, Room } from "@/types";
import {
    Box,
    Button,
    Center,
    chakra,
    Editable,
    EditableInput,
    EditablePreview,
    EditableProps,
    Input,
    Spinner,
    Stack,
} from "@chakra-ui/react";
import { getRandomString, isType, ObjectLiteral, safeJSONParse, SetState, stringify } from "@pastable/core";
import { atom, useAtom } from "jotai";
import { atomFamily } from "jotai/utils";
import { SetStateAction, useRef } from "react";

// TODO proxy+permission xxx.push() emit/throw etc

const presenceAtom = atom([] as Array<Player>);
const usePresence = () => {
    const [presence, setPresence] = useAtom(presenceAtom);
    useSocketEvent("presence/list", setPresence);

    return presence;
};

const getLocalPresence = () => safeJSONParse(sessionStorage.getItem("demo/localPresence"));
const persistLocalPresence = (state: ObjectLiteral) => sessionStorage.setItem("demo/localPresence", stringify(state));

const useUpdatePresence = (): SetState<Player> => {
    const emit = useSocketEmit();
    return (state: SetStateAction<Player>) => {
        const current = isType<Function>(state, typeof state === "function") ? state(getLocalPresence()) : state;
        persistLocalPresence(current);
        emit("presence.update", current);
    };
};

interface RoomPlayer extends Pick<Player, "id"> {
    state: ObjectLiteral;
}
interface Room {
    name: string;
    clients: Array<RoomPlayer>;
    state: Map<any, any>;
}

interface AvailableRoom {
    name: string;
    clients: Array<Pick<Player, "id">>;
}
const roomListAtom = atom([] as Array<AvailableRoom>);
const useRoomList = () => {
    const [roomList, setRoomList] = useAtom(roomListAtom);
    useSocketEvent("room/list", setRoomList);

    return roomList;
};

const roomFamily = atomFamily(
    (props: { name: string }) => atom(new Map()),
    (a, b) => a.name === b.name
);
const useRoomState = (name: string) => {
    const [room, setRoom] = useAtom(roomFamily({ name }));
    useSocketEvent("room/update", console.log);

    return room;
};

const gameFamily = atomFamily(
    (props: { name: string }) => atom({ current: new Map() }),
    (a, b) => a.name === b.name
);
const useGameRoomState = (name: string) => {
    const [game, setGame] = useAtom(gameFamily({ name }));
    // TODO update ref
    useSocketEvent("game/update", console.log);

    return game;
};

export const Demo = () => {
    // Connect to websocket / try to reconnect on focus while not connected / debug in dev
    useSocketConnection();
    useSocketEvent(WsEvent.Open, () => {
        emit("sub#presence");
        emit("sub#rooms");
    });
    useSocketEvent(WsEvent.Any, (payload: { event: string; data: unknown }) =>
        successToast({ title: payload.event, description: payload.data && stringify(payload.data, 2) })
    );

    const setPresence = useUpdatePresence();
    const updateRandomColor = () => setPresence((player) => ({ ...player, color: getRandomColor() }));

    // const rooms = useYArray<Room>(yDoc, "rooms");
    // const roomsList = useSnapshot(rooms);

    // const createRoom = () => rooms.push(makeRoom());
    const emit = useSocketEmit();
    const createRoom = () => emit("room.create#" + inputRef.current.value);
    const joinRoom = () => emit("room.join#" + inputRef.current.value);
    const updateRoom = () => emit("room.update#" + inputRef.current.value, { id: getRandomString() });
    const roomList = useRoomList();
    const inputRef = useRef<HTMLInputElement>();

    const presenceList = usePresence();
    const status = useSocketStatus();
    console.log(presenceList);

    if (status !== "open") {
        return (
            <Center>
                <Spinner />
            </Center>
        );
    }

    return (
        <Stack w="100%">
            <Center flexDir="column" m="8">
                <Stack h="100%">
                    <Stack direction="row" alignItems="center">
                        <chakra.span>(Editable) Username: </chakra.span>
                        {/* <PresenceName /> */}
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
            {/* <SimpleGrid columns={[1, 1, 2, 3, 3, 4]} w="100%" spacing="8">
                {roomsList.map((room, index) => (
                    <GameRoom key={room.id} room={rooms[index]} rooms={rooms} />
                ))}
            </SimpleGrid> */}
            <PlayerList />
        </Stack>
    );
};

// const GameRoom = ({ room, rooms }: { room: Room; rooms: Array<Room> }) => {
//     const snap = useSnapshot(room);
//     const [presence] = usePresence();

//     const joinRoom = () => room.clients.push(presence);
//     const leaveRoom = () => removeItemMutate(room.clients, "id", presence.id);
//     const removeRoom = () => removeItemMutate(rooms, "id", room.id);

//     const game = useYMap(yDoc, "game." + room.id);
//     const [storeId] = useState(() => "statemachine." + room.id);

//     const [initialCtx] = useState(() => ({ game, room }));
//     const [state, send, , sendAndEmit] = useSharedMachine(() => getDemoMachine(initialCtx), {
//         context: initialCtx,
//         yDoc,
//         storeId,
//         proxyKeys: ["game", "room"],
//     });

//     const play = () => sendAndEmit("PLAY", true);
//     const markAsDone = () => sendAndEmit("MARK_DONE");
//     useSocketEvent("PLAY", () => send("PLAY"));

//     const applyCtx = () => send("APPLY_CTX");

//     return (
//         <Stack border="1px solid teal">
//             <Stack direction="row">
//                 <span>id: {snap.id}</span>
//                 <span>state: {getStateValuePath(state)}</span>
//                 <span>ctx isDone: {state.context.game.mark ? "done" : "empty"}</span>
//             </Stack>
//             <span>ctx clients: {state.context.room.clients.map((client) => client.username).toString()}</span>
//             {state.matches("waiting") &&
//                 (Boolean(findBy(state.context.room.clients, "id", presence.id)) ? (
//                     <Button onClick={leaveRoom}>Leave</Button>
//                 ) : (
//                     <Button onClick={joinRoom}>Join</Button>
//                 ))}
//             <Button onClick={removeRoom}>Remove</Button>
//             {state.matches("playing") && <Button onClick={markAsDone}>Mark as done</Button>}
//             <Button onClick={play}>Play</Button>
//             <Button onClick={applyCtx}>Apply ctx</Button>
//         </Stack>
//     );
// };

const PlayerList = () => {
    const players = usePresence();

    return (
        <Box pos="fixed" top="100px" right="0">
            <Stack>
                {players.map((presence) => (
                    <Box key={presence.id} py="2" px="4" w="150px" bgColor={presence.color} pos="relative">
                        <Box
                            pos="absolute"
                            top="0"
                            right="100%"
                            h="100%"
                            w="20px"
                            bgColor={getSaturedColor(presence.color)}
                        />
                        <chakra.span color="black">{presence.id || presence.username}</chakra.span>
                    </Box>
                ))}
            </Stack>
        </Box>
    );
};

const PresenceName = () => {
    const presence = getLocalPresence();
    const setPresence = useUpdatePresence();

    const updateName = (username: Player["username"]) => setPresence((player) => ({ ...player, username }));
    return <EditableName defaultValue={presence.username} onSubmit={updateName} />;
};

const EditableName = (props: EditableProps) => {
    return (
        <Editable {...props}>
            <EditablePreview />
            <EditableInput w="12ch" textAlign="center" />
        </Editable>
    );
};
