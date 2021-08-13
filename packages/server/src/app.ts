import { getRandomString, Primitive, wait } from "@pastable/core";
import fastify from "fastify";
import http from "http";
import { URL } from "url";
import { TextDecoder, TextEncoder } from "util";
import { getRandomColor } from "utils";
import WebSocket from "ws";

export const makeApp = () => {
    const app = fastify({ logger: true });

    app.get("/", async (request, reply) => {
        return { hello: "world" };
    });

    return app;
};

const makeRoom = (name: string): Room => ({ name, clients: new Set(), state: new Map() });
const makeGameRoom = (name: string, tickRate = 100): GameRoom => ({ ...makeRoom(name), tickRate, meta: new Map() });
const getClients = (clients: Set<AppWebsocket>) =>
    Array.from(clients.values()).filter((client) => client.readyState === WebSocket.OPEN);
const getClientState = (ws: AppWebsocket) => ({
    id: (ws as AppWebsocket).id,
    ...Object.fromEntries(Array.from((ws as AppWebsocket).state.entries())),
});

type GlobalSubscription = "presence" | "rooms" | "games";

export const makeWsRelay = (options: WebSocket.ServerOptions) => {
    const wss = new WebSocket.Server(options);
    const rooms = new Map<Room["name"], Room>();
    const games = new Map<Room["name"], GameRoom>();
    const tickIntervals = new WeakMap();
    const globalSubscriptions = new Map<GlobalSubscription, Set<AppWebsocket>>([
        ["presence", new Set()],
        ["rooms", new Set()],
        ["games", new Set()],
    ]);

    const getPresenceList = () => getClients(wss.clients as Set<AppWebsocket>).map(getClientState);

    wss.on("connection", (ws: AppWebsocket, req) => {
        const isValid = isAuthValid(ws, req);
        if (!isValid) return;

        // TODO opts ?

        const broadcastPresenceList = () =>
            globalSubscriptions
                .get("presence")
                .forEach((client) => sendMsg(client, ["presence/list", getPresenceList()]));

        const broadcastSub = (sub: GlobalSubscription, event: string, payload?: any) =>
            globalSubscriptions
                .get(sub)
                .forEach((client) => client !== ws && sendMsg(client, [event.replace(".", "/"), payload]));
        const broadcastEvent = (room: Room, event: string, payload?: any) =>
            room.clients.forEach((client) => sendMsg(client, [event.replace(".", "/"), payload]));
        const sendPresenceList = () =>
            sendMsg(ws, ["presence/list", getClients(wss.clients as Set<AppWebsocket>).map(getClientState)]);
        const sendRoomsList = () =>
            sendMsg(ws, [
                "room/list",
                Array.from(rooms.entries()).map(([name, room]) => ({
                    name,
                    clients: getClients(room.clients).map((ws) => ws.id),
                })),
            ]);
        const sendGamesList = () =>
            sendMsg(ws, [
                "game/list",
                Array.from(games.entries()).map(([name, room]) => ({
                    name,
                    clients: getClients(room.clients).map((ws) => ws.id),
                })),
            ]);

        ws.isAlive = true;
        ws.id = getRandomString(11);
        ws.state = new Map(Object.entries({ color: getRandomColor() }));
        ws.meta = new Map(Object.entries({ intervals: new Set() }));
        ws.on("pong", () => (ws.isAlive = true));
        ws.on("close", () => {
            broadcastSub("presence", "presence/exit");
            broadcastPresenceList();
        });

        broadcastSub("presence", "presence/entry");
        broadcastPresenceList();

        ws.on("message", (data: ArrayBuffer | string, binary: boolean) => {
            const message = decode<WsEventPayload>(data);
            if (!message) return;

            const [event, payload] = message;
            if (!event) return;

            const opts = { binary: false };
            console.log(message);

            if (["relay", "broadcast"].includes(event)) {
                wss.clients.forEach((client) => {
                    if (client.readyState !== WebSocket.OPEN) return;
                    const canSend = event === "broadcast" ? client !== ws : true;
                    if (!canSend) return;

                    return client.send(data, opts);
                });
                return;
            }

            if (event.startsWith("sub")) {
                const type = getEventParam(event) as GlobalSubscription;
                if (!type) return;

                const sub = globalSubscriptions.get(type);
                if (!sub) return;

                sub.add(ws);

                const userIntervals = ws.meta.get("intervals") as Set<NodeJS.Timer>;
                if (type === "presence") {
                    userIntervals.add(setInterval(sendPresenceList, 10 * 1000));
                    return sendPresenceList();
                }

                if (type === "rooms") {
                    userIntervals.add(setInterval(sendRoomsList, 10 * 1000));
                    return sendRoomsList();
                }

                if (type === "games") {
                    userIntervals.add(setInterval(sendGamesList, 10 * 1000));
                    return sendGamesList();
                }
            }

            if (event.startsWith("presence.update")) {
                if (!payload) return;
                const type = getEventParam(event);
                const map = type === "meta" ? ws.meta : ws.state;

                Object.entries(payload).map(([key, value]) => map.set(key, value));
                broadcastPresenceList();

                return;
            }
            if (event.startsWith("presence.list")) {
                return sendPresenceList();
            }

            if (event.startsWith("room.list")) {
                return sendRoomsList();
            }
            if (event.startsWith("room.create")) {
                const name = getEventParam(event);
                if (!name) return;

                const room = makeRoom(name);
                room.clients.add(ws);
                rooms.set(name, room);

                const interval = setInterval(
                    () =>
                        room.state.size &&
                        room.clients.forEach((client) =>
                            sendMsg(client, ["room/update", Object.fromEntries(room.state)])
                        ),
                    10 * 1000
                );
                tickIntervals.set(room, interval);

                broadcastSub("rooms", "room/list", event);
                broadcastEvent(room, event);
                return;
            }
            if (event.startsWith("room.join")) {
                const name = getEventParam(event);
                if (!name) return;

                const room = rooms.get(name);
                if (!room) return sendMsg(ws, ["room/notFound", name], opts);

                room.clients.add(ws);
                sendMsg(ws, ["room/update", Object.fromEntries(room.state)]);

                broadcastSub("rooms", "room/list", event);
                broadcastEvent(room, event);
                return;
            }
            if (event.startsWith("room.joinOrCreate")) {
                const name = getEventParam(event);
                if (!name) return;

                const room = rooms.get(name) || makeRoom(name);
                room.clients.add(ws);
                rooms.set(name, room);

                broadcastSub("rooms", "room/list", event);
                broadcastEvent(room, event);
                return;
            }
            // TODO room.update#name:field to update a specific field ?
            // TODO can only update room if in it ?
            if (event.startsWith("room.update")) {
                const name = getEventParam(event);
                if (!name) return;

                const room = rooms.get(name);
                if (!room) return sendMsg(ws, ["room/notFound", name], opts);
                if (!payload) return;

                Object.entries(payload).map(([key, value]) => room.state.set(key, value));

                broadcastEvent(room, event, payload);
                return;
            }
            if (event.startsWith("room.leave")) {
                const name = getEventParam(event);
                if (!name) return;

                const room = rooms.get(name);
                if (!room) return sendMsg(ws, ["game/notFound", name], opts);

                room.clients.delete(ws);

                broadcastSub("rooms", "room/list", event);
                return;
            }
            if (event.startsWith("room.delete")) {
                const name = getEventParam(event);
                if (!name) return;

                rooms.delete(name);
                const room = rooms.get(name);
                const interval = tickIntervals.get(room);
                clearInterval(interval);
                tickIntervals.delete(room);

                broadcastSub("rooms", "room/list", event);
                return;
            }
            if (event.startsWith("room.relay")) {
                const name = getEventParam(event);
                if (!name) return;

                const room = rooms.get(name);
                if (!room) return sendMsg(ws, ["room/notFound", name], opts);

                room.clients.forEach((client) => sendMsg(client, payload.data, opts));
                return;
            }
            if (event.startsWith("room.broadcast")) {
                const name = getEventParam(event);
                if (!name) return;

                const room = rooms.get(name);
                if (!room) return sendMsg(ws, ["room/notFound", name], opts);

                room.clients.forEach((client) => ws !== client && sendMsg(client, payload.data, opts));
                return;
            }

            if (event.startsWith("game.list")) {
                return sendGamesList();
            }
            if (event.startsWith("game.create")) {
                const name = getEventParam(event);
                if (!name) return;

                const room = makeGameRoom(name);
                room.clients.add(ws);
                games.set(name, room);

                const interval = setInterval(
                    () =>
                        room.state.size &&
                        room.clients.forEach((client) =>
                            sendMsg(client, ["game/update", Object.fromEntries(room.state)])
                        ),
                    room.tickRate
                );
                tickIntervals.set(room, interval);

                broadcastSub("games", event);
                return;
            }
            if (event.startsWith("game.join")) {
                const name = getEventParam(event);
                if (!name) return;

                const room = games.get(name);
                if (!room) return sendMsg(ws, ["game/notFound", name], opts);

                room.clients.add(ws);

                broadcastSub("games", event);
                return;
            }
            if (event.startsWith("game.leave")) {
                const name = getEventParam(event);
                if (!name) return;

                const room = games.get(name);
                if (!room) return sendMsg(ws, ["game/notFound", name], opts);

                room.clients.delete(ws);

                broadcastSub("games", event);
                return;
            }
            if (event.startsWith("game.update")) {
                const name = getEventParam(event);
                if (!name) return;

                const room = games.get(name);
                if (!room) return sendMsg(ws, ["game/notFound", name], opts);
                if (!payload) return;

                const type = payload.__type === "meta" ? "meta" : "state";
                const map = type === "meta" ? room.meta : room.state;

                Object.entries(payload).map(([key, value]) => map.set(key, value));

                return;
            }
            if (event.startsWith("game.delete")) {
                const name = getEventParam(event);
                if (!name) return;

                games.delete(name);
                const room = games.get(name);
                const interval = tickIntervals.get(room);
                clearInterval(interval);
                tickIntervals.delete(room);

                broadcastSub("games", event);
                return;
            }
        });
    });

    const interval = setInterval(() => {
        wss.clients.forEach((ws) => {
            if ((ws as AppWebsocket).isAlive === false) return ws.terminate();

            (ws as AppWebsocket).isAlive = false;
            ws.ping(noop);
        });
    }, 60 * 1000);

    wss.on("close", (aaa, bbb, ccc, dd) => {
        clearInterval(interval);
    });

    return wss;
};

const getEventParam = (event: string) => event.split("#")[1];

const sendBinaryMsg = (ws: WebSocket, payload: WsEventPayload, opts?: any) =>
    ws.readyState === WebSocket.OPEN && ws.send(encode(payload), opts);
const sendStrMsg = (ws: WebSocket, [event, data]: WsEventPayload, opts?: any) =>
    // @ts-ignore
    console.log([event, data]) ||
    (ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify(event && data ? [event, data] : [event]), opts));
const sendMsg = sendStrMsg;

type WsEventPayload<Data = any> = [event: string, data?: Data];
type WsEventPayloadData = [event: string, payload: Primitive];

// type StartsWith<Prefix extends string> = `${Prefix}${string}`;
// const startsWith = <Prefix extends string>(prefix: Prefix, string: string): string is StartsWith<Prefix> =>
//     string.startsWith(prefix);
// type WsEventMap =
//     | { event: `room.join#${string}` }
//     | { event: `room.create#${string}` }
//     | { event: `room.joinOrCreate#${string}` }
//     | { event: `room.delete#${string}` }
//     | { event: `room.relay#${string}`; payload: WsEventPayloadData }
//     | { event: `room.broadcast#${string}`; payload: WsEventPayloadData }
//     | { event: "relay"; payload: WsEventPayloadData }
//     | { event: "broadcast"; payload: WsEventPayloadData }
//     | { event: `game.join#${string}` }
//     | { event: `game.create#${string}` }
//     | { event: `game.update#${string}`; payload: ObjectLiteral };

/**
 * Room are used to sync only when events happen and every X seconds
 * Events are broadcasted to everyone else in the room but the sender
 */
interface Room {
    name: string;
    clients: Set<AppWebsocket>;
    state: Map<any, any>;
}

/**
 * GameRoom are used to handle fast updates
 * Events are broadcasted to everyone at the given tick rate
 */
interface GameRoom extends Room {
    tickRate: number;
    meta?: Map<any, any>;
}

function noop() {}
type AppWebsocket = WebSocket & { id?: string; state: Map<any, any>; meta: Map<any, any>; isAlive?: boolean };

const pw = "chainbreak";
const isAuthValid = async (ws: WebSocket, req: http.IncomingMessage) => {
    const url = new URL((req.url.startsWith("/") ? "http://localhost" : "") + req.url);
    const auth = url.searchParams.get("auth");
    if (auth !== pw) {
        // cheap rate-limiting
        await wait(2000);
        ws.close();
        return false;
    }

    return true;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const encode = <Payload>(payload: Payload) => encoder.encode(JSON.stringify(payload));
const decode = <Payload = any>(payload: ArrayBuffer | string): Payload => {
    try {
        const data = payload instanceof ArrayBuffer ? decoder.decode(payload) : payload;
        return JSON.parse(data);
    } catch (err) {
        return null;
    }
};
