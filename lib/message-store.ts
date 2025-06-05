// Almacén temporal de mensajes (en producción usarías Redis o similar)
const messageStore: Record<string, Array<any>> = {}

// Función para almacenar un mensaje de bot
export function storeBotMessage(conversationId: string, message: any) {
  if (!messageStore[conversationId]) {
    messageStore[conversationId] = []
  }
  messageStore[conversationId].push(message)

  // Limitar el tamaño del almacén para cada conversación
  if (messageStore[conversationId].length > 100) {
    messageStore[conversationId] = messageStore[conversationId].slice(-100)
  }

  console.log(`Mensaje almacenado para conversación ${conversationId}:`, message)
}

// Función para obtener mensajes pendientes
export function getPendingMessages(conversationId: string) {
  return messageStore[conversationId] || []
}

// Función para limpiar mensajes pendientes
export function clearPendingMessages(conversationId: string) {
  const messages = messageStore[conversationId] || []
  delete messageStore[conversationId]
  return messages
}
