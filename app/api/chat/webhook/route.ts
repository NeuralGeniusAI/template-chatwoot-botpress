import { type NextRequest, NextResponse } from "next/server";
import { storeBotMessage } from "@/lib/message-store";

async function sendToN8nWebhook(message: any) {
  try {
    console.log("Enviando mensaje a n8n:", message);

    const response = await fetch("https://neuralgeniusai.com/webhook/replicar-botpress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...message,
        message: message.content,
        sender: message.role,
        timestamp: message.timestamp,
        messageId: message.id,
        conversationId: message.conversationId || "nueva-conversacion",
        userAgent: "bot-server", // o navigator.userAgent si estás en frontend
        userId: `user-${message.id}`,
        attachments: message.attachments?.map(att => ({
          type: att.type,
          name: att.name,
          url: att.url,
        })),
        payload: {
          text: message.content,
          id: message.id,
          attachments: message.attachments || [],
        },
      }),
    });

    if (!response.ok) {
      console.error("Error al enviar al webhook:", await response.text());
    }
  } catch (err) {
    console.error("Error en la conexión con el webhook:", err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const botResponse = await request.json();

    console.log(
      "Webhook recibido de Botpress:",
      JSON.stringify(botResponse, null, 2)
    );

    const conversationId =
      botResponse.botpressConversationId ||
      botResponse.conversation?.id ||
      botResponse.conversationId;

    if (!conversationId) {
      console.error("No se encontró conversationId en la respuesta de Botpress");
      return NextResponse.json(
        { error: "No se encontró conversationId" },
        { status: 400 }
      );
    }

    // Procesamiento del mensaje
    let botMessage = "No se pudo extraer el mensaje";
    let attachments = [];

    switch (botResponse.type) {
      case "text":
        if (botResponse.payload?.text) {
          botMessage = botResponse.payload.text;
          attachments = botResponse.payload.attachments || [];
        }
        break;
      case "image":
        botMessage = "";
        if (botResponse.payload?.imageUrl) {
          attachments.push({
            id: botResponse.botpressMessageId || `att-${Date.now()}`,
            type: "image",
            name: "Imagen del bot",
            url: botResponse.payload.imageUrl,
          });
        }
        break;
      case "file":
        botMessage = botResponse.payload?.title || "";
        if (botResponse.payload?.fileUrl) {
          attachments.push({
            id: botResponse.botpressMessageId || `att-${Date.now()}`,
            type: "document",
            name: botResponse.payload.title || "Archivo",
            url: botResponse.payload.fileUrl,
          });
        }
        break;
      default:
        if (botResponse.text) {
          botMessage = botResponse.text;
        }
        break;
    }

    const messageData = {
      role: "assistant",
      content: botMessage,
      id: botResponse.botpressMessageId || botResponse.id || `bot-${Date.now()}`,
      timestamp: new Date().toISOString(),
      conversationId,
      attachments,
    };

    // Guardar en store local
    storeBotMessage(conversationId, messageData);

    // Enviar a n8n
    await sendToN8nWebhook(messageData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al procesar la respuesta de Botpress:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
