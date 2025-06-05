import { type NextRequest, NextResponse } from "next/server"
import { BOTPRESS_TOKEN, WEBHOOK_URL } from "@/lib/constants"

export async function POST(request: NextRequest) {
  try {
    // Obtener los datos del cuerpo de la solicitud
    const requestData = await request.json()

    // Verificar que tenemos los datos necesarios
    if (!requestData.text && !requestData.attachments) {
      return NextResponse.json({ error: "Se requiere un mensaje de texto o archivos adjuntos" }, { status: 400 })
    }

    // Asegurarse de que tenemos un ID de conversación
    const conversationId = requestData.conversationId || `conv-${Math.random().toString(36).substring(2, 15)}`

    // Preparar la solicitud para Botpress
    const botpressPayload = {
      userId: requestData.userId || `user-${Date.now()}`,
      messageId: requestData.messageId || `msg-${Date.now()}`,
      conversationId: conversationId,
      type: "text",
      text: requestData.text || "Mensaje con archivos adjuntos",
      payload: {
        text: requestData.text || "",
        attachments: requestData.attachments || [],
      },
    }

    console.log("Enviando a Botpress:", JSON.stringify(botpressPayload, null, 2))

    // Enviar la solicitud a Botpress
    const botpressResponse = await fetch(WEBHOOK_URL ? WEBHOOK_URL : "", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `bearer ${BOTPRESS_TOKEN}`,
      },
      body: JSON.stringify(botpressPayload),
    })

    // Verificar si la respuesta de Botpress es exitosa
    if (!botpressResponse.ok) {
      const errorText = await botpressResponse.text()
      console.error("Error de Botpress:", errorText)
      return NextResponse.json(
        { error: `Error del servidor de Botpress: ${botpressResponse.status}` },
        { status: botpressResponse.status },
      )
    }

    // Procesar la respuesta de Botpress (esta es solo la confirmación, no la respuesta del bot)
    const botpressData = await botpressResponse.json()
    console.log("Respuesta recibida de Botpress (confirmación):", JSON.stringify(botpressData, null, 2))

    // Extraer el ID de conversación de Botpress
    const botpressConversationId = botpressData.conversation?.id || botpressData.conversationId || conversationId

    // SOLUCIÓN TEMPORAL: Esperar un poco y luego simular una respuesta del bot
    // Esto es solo para asegurarnos de que el frontend reciba una respuesta
    // En producción, esto vendría del webhook
    // const simulatedBotMessage = {
    //   role: "assistant",
    //   content: "¡Hola! Estoy aquí para ayudarte. ¿En qué puedo asistirte hoy?",
    //   id: `bot-${Date.now()}`,
    //   timestamp: new Date().toISOString(),
    // }

    // Devolver la respuesta simulada al frontend
    return NextResponse.json({
      success: true,
      message: "Mensaje enviado correctamente. Esperando respuesta...",
      conversationId: botpressConversationId,
      messageId: botpressPayload.messageId,
      botpressUserId: botpressData.user?.id,
      // botMessage: simulatedBotMessage, // Incluir el mensaje completo
    })
  } catch (error) {
    console.error("Error en el servidor:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
