import { useSocketEmit, useSocketStatus } from "@/hooks/useSocketConnection";
import { Player, Room } from "@/types";
import { ObjectLiteral, stringify } from "@pastable/core";

export const useSocketClient = () => {
    const emit = useSocketEmit();
    const status = useSocketStatus();

    // TODO relay/broadcast + sub/unsub + presence

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

    const games = {
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

    return { emit, status, rooms, games };
};

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
