import Pusher from "pusher";
import PusherClient from "pusher-js";

// Inicializar el servidor Pusher (para enviar mensajes)
export const pusherServer = new Pusher({
  appId: "1980110",
  key: "155d598a7e0e793fd837",
  secret: "1499085b192887121851",
  cluster: "us2",
  useTLS: true,
});

// Inicializar el cliente Pusher (para recibir mensajes)
export const pusherClient = new PusherClient(process.env.PUSHER_KEY || "", {
  cluster: "us2",
});
