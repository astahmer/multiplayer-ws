import { useSocketEmit, useSocketEvent, useSocketStatus } from "@/hooks/useSocketConnection";
import { AvailableRoom, Room } from "@/types";
import { useConst } from "@chakra-ui/react";
import { hash, ObjectLiteral, safeJSONParse, stringify } from "@pastable/core";
import { atom, useAtom } from "jotai";
import { atomFamily, useAtomValue } from "jotai/utils";
import { useEffect, useRef } from "react";

// TODO on un-sync(=ws disconnect), reset everything ?
export const roomListAtom = atom([] as Array<AvailableRoom>);
export const useRoomList = () => {
    const [roomList, setRoomList] = useAtom(roomListAtom);

    const prevStateHashRef = useRef<string>();
    useSocketEvent<Array<AvailableRoom>>("rooms/list", (updated) => {
        const updateHash = hash(updated);
        if (prevStateHashRef.current !== updateHash) {
            setRoomList(updated);
            prevStateHashRef.current = updateHash;
        }
    });

    return roomList;
};

export const useSocketClient = () => {
    const emit = useSocketEmit();
    const status = useSocketStatus();

    const rooms: RoomClient = {
        list: () => emit("rooms.list"),
        sub: () => emit("sub#rooms"),
        unsub: () => emit("unsub#rooms"),
        join: (name: Room["name"]) => emit("rooms.join#" + name),
        // TODO initial state
        create: (name: Room["name"]) => emit("rooms.create#" + name),
        update: (name: Room["name"], update: ObjectLiteral) => emit("rooms.update#" + name, stringify(update, 0)),
        leave: (name: Room["name"]) => emit("rooms.leave#" + name),
        delete: (name: Room["name"]) => emit("rooms.delete#" + name),
        relay: (name: Room["name"], msg: any) => emit("rooms.relay#" + name, msg),
        broadcast: (name: Room["name"], msg: any) => emit("rooms.broadcast#" + name, msg),
    };

    const games = {
        list: () => emit("games.list"),
        sub: () => emit("sub#games"),
        unsub: () => emit("unsub#games"),
        join: (name: Room["name"]) => emit("games.join#" + name),
        // TODO initial state
        create: (name: Room["name"]) => emit("games.create#" + name),
        update: (name: Room["name"], update: ObjectLiteral) => emit("games.update#" + name, update),
        updateMeta: (name: Room["name"], update: ObjectLiteral) =>
            emit("games.update.meta#" + name, stringify(update, 0)),
        leave: (name: Room["name"]) => emit("games.leave#" + name),
        delete: (name: Room["name"]) => emit("games.delete#" + name),
        relay: (name: Room["name"], msg: any) => emit("games.relay#" + name, msg),
        broadcast: (name: Room["name"], msg: any) => emit("games.broadcast#" + name, msg),
    };

    return { emit, status, rooms, games };
};

export const roomFamily = atomFamily(
    (props: Room) => atom(props),
    (a, b) => a.name === b.name
);
export const useRoomState = <State extends ObjectLiteral = Room>(name: string) => {
    const initialValue = useConst({ name, clients: [], state: {} });
    const [room, setRoom] = useAtom(roomFamily(initialValue));

    // Init room hash to compare server updates to
    const prevStateHashRef = useRef<string>();
    useEffect(() => {
        prevStateHashRef.current = hash(initialValue);
    }, []);

    // Granular state updates whenever someone triggers a state change
    useSocketEvent<Partial<State>>("rooms/update#" + name, (update) => {
        setRoom((current) => {
            const updated = { ...current, state: { ...current.state, ...(update || {}) } };
            const updateHash = hash(updated);

            if (prevStateHashRef.current !== updateHash) {
                prevStateHashRef.current = updateHash;
                return updated;
            }

            return current;
        });
    });

    // Full room, retrieved every X seconds
    useSocketEvent<Room>("rooms/state#" + name, (updated) => {
        const updateHash = hash(updated);
        if (prevStateHashRef.current !== updateHash) {
            setRoom(updated);
            prevStateHashRef.current = updateHash;
        }
    });

    // TODO ça delete pas
    // Reset room with that name on deleted
    useSocketEvent("rooms/delete#", () => console.log("DELETE") || setRoom(initialValue));

    // Add clients on join
    useSocketEvent("rooms/join#", (newClient) =>
        setRoom((current) => ({ ...current, clients: current.clients.concat(newClient) }))
    );
    console.log(room);

    const client = useSocketClient();
    const roomClient = useConst(makeSpecificRoomClient(client.rooms, name));

    return { name: room.name, state: room.state as Room & State, clients: room.clients, ...roomClient };
};

const makeSpecificRoomClient = (client: RoomClient, name: Room["name"]) => ({
    ...client,
    join: () => client.join.apply(null, [name]) as void,
    create: () => client.create.apply(null, [name]) as void,
    // TODO SetState fn ?
    update: (update: ObjectLiteral) => client.update.apply(null, [name, update]),
    leave: () => client.leave.apply(null, [name]) as void,
    delete: () => client.delete.apply(null, [name]) as void,
    relay: (msg: any) => client.relay.apply(null, [name, msg]) as void,
    broadcast: (msg: any) => client.broadcast.apply(null, [name, msg]) as void,
});
const makeSpecificGameRoomClient = (client: GameRoomClient, name: Room["name"]) => ({
    ...makeSpecificRoomClient(client, name),
    updateMeta: (update: ObjectLiteral) => client.updateMeta.apply(null, [name, update]) as void,
});

interface RoomClient {
    list: () => void;
    sub: () => void;
    unsub: () => void;
    join: (name: Room["name"]) => void;
    create: (name: Room["name"]) => void;
    update: (name: Room["name"], update: ObjectLiteral) => void;
    leave: (name: Room["name"]) => void;
    delete: (name: Room["name"]) => void;
    relay: (name: Room["name"], msg: any) => void;
    broadcast: (name: Room["name"], msg: any) => void;
}
interface GameRoomClient extends RoomClient {
    updateMeta: (name: Room["name"], update: ObjectLiteral) => void;
}

export const gameFamily = atomFamily(
    (props: Room) => atom({ current: props }),
    (a, b) => a.name === b.name
);
export const useGameRoomState = <State extends ObjectLiteral = Room>(name: string) => {
    const gameRef = useAtomValue(gameFamily({ name, clients: [], state: {} }));
    useSocketEvent("games/update#" + name, (update: Room & State) => (gameRef.current = update));

    const client = useSocketClient();
    const gameClient = useConst(makeSpecificGameRoomClient(client.games, name));

    return { ref: gameRef as { current: Room & State }, ...gameClient };
};
