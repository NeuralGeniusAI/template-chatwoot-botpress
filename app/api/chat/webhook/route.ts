import { type NextRequest, NextResponse } from "next/server";
import { storeBotMessage } from "@/lib/message-store";

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

    // Extraer mensaje y attachments
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
        botMessage =
          botResponse.payload?.title || "";
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
      id:
        botResponse.botpressMessageId || botResponse.id || `bot-${Date.now()}`,
      timestamp: new Date().toISOString(),
      conversationId,
      attachments,
    };

    storeBotMessage(conversationId, messageData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al procesar la respuesta de Botpress:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
