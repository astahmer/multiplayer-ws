import { getEventParam, getRoomClients, getRoomState, isUserInSet, makeGameRoom } from "helpers";
import { EventHandlerRef } from "types";
import { sendMsg } from "ws-helpers";

export function handleGamesEvent({
    event,
    payload,
    ws,
    opts,
    user,
    games,
    broadcastSub,
    getGameRoomListEvent,
    sendGamesList,
}: EventHandlerRef) {
    if (event.startsWith("games.list")) {
        return sendGamesList();
    }

    if (event.startsWith("games.create")) {
        const name = getEventParam(event);
        if (!name) return;
        if (games.get(name)) return sendMsg(ws, ["room/exists", name], opts);

        // TODO initial state
        const room = makeGameRoom(name, payload);
        room.clients.add(ws);
        games.set(name, room);

        const stateRefreshInterval = setInterval(
            () =>
                room.state.size &&
                room.clients.forEach((client) => sendMsg(client, ["games/state#" + name, getRoomState(room)])),
            room.config.tickRate
        );
        const timers = room.internal.get("timers") as Map<string, NodeJS.Timer>;
        timers.set("state", stateRefreshInterval);

        const clientsRefreshInterval = setInterval(
            () => room.clients.forEach((client) => sendMsg(client, ["games/clients#" + name, getRoomClients(room)])),
            room.config.tickRate
        );
        timers.set("clients", clientsRefreshInterval);

        broadcastSub("games", getGameRoomListEvent());
        return;
    }

    if (event.startsWith("games.join")) {
        const name = getEventParam(event);
        if (!name) return;

        const room = games.get(name);
        if (!room) return sendMsg(ws, ["games/notFound", name], opts);
        if (isUserInSet(room.clients, ws.id)) return;

        room.clients.add(ws);

        broadcastSub("games", getGameRoomListEvent());
        return;
    }

    if (event.startsWith("games.leave")) {
        const name = getEventParam(event);
        if (!name) return;

        const room = games.get(name);
        if (!room) return sendMsg(ws, ["games/notFound", name], opts);

        room.clients.delete(ws);

        broadcastSub("games", getGameRoomListEvent());
        return;
    }

    if (event.startsWith("rooms.kick")) {
        const name = getEventParam(event);
        if (!name) return;

        const room = games.get(name);
        if (!room) return sendMsg(ws, ["games/notFound", name], opts);

        // TODO check permissions
        room.clients.delete(ws);
        user.rooms.delete(room);

        broadcastSub("rooms", getGameRoomListEvent());
        return;
    }

    if (event.startsWith("games.update")) {
        const name = getEventParam(event);
        if (!name) return;

        const room = games.get(name);
        if (!room) return sendMsg(ws, ["games/notFound", name], opts);

        const update = payload;
        if (!Object.keys(update).length) return;

        const type = event.startsWith("games.update.meta") ? "meta" : "state";
        const map = type === "meta" ? room.meta : room.state;

        Object.entries(update).map(([key, value]) => map.set(key, value));

        return;
    }

    if (event.startsWith("games.delete")) {
        const name = getEventParam(event);
        if (!name) return;

        const room = games.get(name);
        games.delete(name);

        const timers = room.internal.get("timers") as Map<string, NodeJS.Timer>;
        timers.forEach((interval) => clearInterval(interval));
        timers.clear();

        broadcastSub("games", getGameRoomListEvent());
        return;
    }
}
