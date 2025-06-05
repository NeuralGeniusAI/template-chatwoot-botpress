import { type NextRequest, NextResponse } from "next/server"
import { getPendingMessages, clearPendingMessages } from "@/lib/message-store"

// Esta ruta permite al frontend obtener mensajes pendientes mediante polling
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const conversationId = searchParams.get("conversationId")
    const clear = searchParams.get("clear") === "true"

    if (!conversationId) {
      return NextResponse.json({ error: "Se requiere conversationId" }, { status: 400 })
    }

    // Obtener mensajes pendientes
    const messages = clear ? clearPendingMessages(conversationId) : getPendingMessages(conversationId)

    return NextResponse.json({
      success: true,
      messages,
      count: messages.length,
    })
  } catch (error) {
    console.error("Error al obtener mensajes pendientes:", error)
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 })
  }
}
