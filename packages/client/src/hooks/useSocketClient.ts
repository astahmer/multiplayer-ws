import { useSocketEmit, useSocketStatus } from "@/hooks/useSocketConnection";
import { Player, Room } from "@/types";
import { ObjectLiteral, stringify } from "@pastable/core";
import { usePresenceIsSynced } from "./usePresence";

export const useSocketClient = () => {
    const emit = useSocketEmit();
    const status = useSocketStatus();
    const isSynced = usePresenceIsSynced();

    const relay = (msg: any) => emit("relay", msg);
    const broadcast = (msg: any) => emit("broadcast", msg);

    const presence: PresenceClient = {
        sub: (topic: string) => emit("sub#" + topic),
        unsub: (topic: string) => emit("unsub#" + topic),
        list: () => emit("presence.list"),
        update: (state: Partial<Player>) => emit("presence.update", state),
        updateMeta: (meta: ObjectLiteral) => emit("presence.update#meta", meta),
    };

    const rooms: RoomClient = {
        list: () => emit("rooms.list"),
        sub: () => emit("sub#rooms"),
        unsub: () => emit("unsub#rooms"),
        get: (name: Room["name"]) => emit("rooms.get#" + name),
        join: (name: Room["name"]) => emit("rooms.join#" + name),
        create: (name: Room["name"], initialState?: ObjectLiteral) => emit("rooms.create#" + name, initialState),
        update: (name: Room["name"], update: ObjectLiteral) => emit("rooms.update#" + name, stringify(update, 0)),
        kick: (name: Room["name"], id: Player["id"]) => emit("rooms.kick#" + name, id),
        leave: (name: Room["name"]) => emit("rooms.leave#" + name),
        delete: (name: Room["name"]) => emit("rooms.delete#" + name),
        relay: (name: Room["name"], msg: any) => emit("rooms.relay#" + name, msg),
        broadcast: (name: Room["name"], msg: any) => emit("rooms.broadcast#" + name, msg),
    };

    const games: GameRoomClient = {
        list: () => emit("games.list"),
        sub: () => emit("sub#games"),
        unsub: () => emit("unsub#games"),
        get: (name: Room["name"]) => emit("games.get#" + name),
        join: (name: Room["name"]) => emit("games.join#" + name),
        create: (name: Room["name"], initialState?: ObjectLiteral) => emit("games.create#" + name, initialState),
        update: (name: Room["name"], update: ObjectLiteral) => emit("games.update#" + name, update),
        updateMeta: (name: Room["name"], update: ObjectLiteral) =>
            emit("games.update.meta#" + name, stringify(update, 0)),
        kick: (name: Room["name"], id: Player["id"]) => emit("games.kick#" + name, id),
        leave: (name: Room["name"]) => emit("games.leave#" + name),
        delete: (name: Room["name"]) => emit("games.delete#" + name),
        relay: (name: Room["name"], msg: any) => emit("games.relay#" + name, msg),
        broadcast: (name: Room["name"], msg: any) => emit("games.broadcast#" + name, msg),
    };

    return { emit, status, isSynced, presence, rooms, games, relay, broadcast };
};

export interface PresenceClient {
    sub: (topic: string) => void;
    unsub: (topic: string) => void;
    list: () => void;
    update: (state: Partial<Player>) => void;
    updateMeta: (meta: ObjectLiteral) => void;
}

export interface RoomClient {
    list: () => void;
    sub: () => void;
    unsub: () => void;
    get: (name: Room["name"]) => void;
    join: (name: Room["name"]) => void;
    create: (name: Room["name"], initialState?: ObjectLiteral) => void;
    update: (name: Room["name"], update: ObjectLiteral) => void;
    leave: (name: Room["name"]) => void;
    kick: (name: Room["name"], id: Player["id"]) => void;
    delete: (name: Room["name"]) => void;
    relay: (name: Room["name"], msg: any) => void;
    broadcast: (name: Room["name"], msg: any) => void;
}
export interface GameRoomClient extends RoomClient {
    updateMeta: (name: Room["name"], update: ObjectLiteral) => void;
}
