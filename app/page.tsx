"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Send,
  Paperclip,
  ChevronDown,
  Mic,
  X,
  FileText,
  ImageIcon,
  Music,
  Film,
} from "lucide-react";
import { TITLE_PAGE, AGENT_NAME } from "@/lib/constants";

// Definir tipos para los mensajes y archivos
type MessageRole = "user" | "assistant";
type FileType = "image" | "audio" | "video" | "document" | "other";

interface Attachment {
  id: string;
  type: FileType;
  name: string;
  url: string;
  blob?: Blob;
}

interface Message {
  role: MessageRole;
  content: string;
  id: string;
  timestamp: Date;
  attachments?: Attachment[];
}

export default function ChatInterface() {
  // Estados para manejar la conversación
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Referencias
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);


  useEffect(() => {
    setMounted(true);
    return () => {
      // Limpiar grabación al desmontar
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Efecto para iniciar el polling cuando cambia el conversationId
  useEffect(() => {
    if (!conversationId) return;

    console.log(`Iniciando polling para conversación: ${conversationId}`);

    // Función para obtener mensajes pendientes
    const fetchPendingMessages = async () => {
      try {
        const response = await fetch(
          `/api/chat/poll?conversationId=${conversationId}&clear=true`
        );

        if (!response.ok) {
          throw new Error(`Error en la respuesta: ${response.status}`);
        }

        const data = await response.json();

        if (data.messages && data.messages.length > 0) {
          console.log(
            `Recibidos ${data.messages.length} mensajes pendientes:`,
            data.messages
          );

          // Procesar cada mensaje recibido
          data.messages.forEach((messageData: Message) => {
            // Convertir la fecha de string a objeto Date
            const timestamp = messageData.timestamp
              ? new Date(messageData.timestamp)
              : new Date();

            // Crear el mensaje del asistente
            const assistantMessage: Message = {
              role: "assistant",
              content: messageData.content,
              id: messageData.id || `bot-${Date.now()}`,
              timestamp,
              attachments: messageData.attachments,
            };

            // Actualizar la lista de mensajes con la respuesta del asistente
            setMessages((prev) => {
              // Verificar si el mensaje ya existe para evitar duplicados
              if (prev.some((msg) => msg.id === assistantMessage.id)) {
                return prev;
              }
              return [...prev, assistantMessage];
            });

            // Desactivar el estado de carga si estaba activo
            setIsLoading(false);
          });
        }
      } catch (err) {
        console.error("Error al obtener mensajes pendientes:", err);
      }
    };

    // Ejecutar inmediatamente y luego cada 2 segundos
    fetchPendingMessages();

    pollingIntervalRef.current = setInterval(fetchPendingMessages, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [conversationId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Función para formatear la hora
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Función para formatear el tiempo de grabación
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Función para generar un ID único
  const generateId = () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  };

  // Función para manejar el cambio en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Función para abrir el selector de archivos
  const handleAttachmentClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Función para determinar el tipo de archivo
  const getFileType = (file: File): FileType => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("audio/")) return "audio";
    if (file.type.startsWith("video/")) return "video";
    if (
      file.type.startsWith("application/pdf") ||
      file.type.startsWith("application/msword") ||
      file.type.startsWith(
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) ||
      file.type.startsWith("text/")
    )
      return "document";
    return "other";
  };

  // Función para manejar la selección de archivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newAttachments: Attachment[] = [];

      Array.from(e.target.files).forEach((file) => {
        const fileType = getFileType(file);
        const fileUrl = URL.createObjectURL(file);

        newAttachments.push({
          id: generateId(),
          type: fileType,
          name: file.name,
          url: fileUrl,
          blob: file,
        });
      });

      setAttachments((prev) => [...prev, ...newAttachments]);

      // Limpiar el input de archivos para permitir seleccionar el mismo archivo nuevamente
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Función para eliminar un archivo adjunto
  const removeAttachment = (id: string) => {
    setAttachments((prev) => {
      const filtered = prev.filter((attachment) => attachment.id !== id);
      // Liberar URL del objeto
      const attachmentToRemove = prev.find(
        (attachment) => attachment.id === id
      );
      if (attachmentToRemove) {
        URL.revokeObjectURL(attachmentToRemove.url);
      }
      return filtered;
    });
  };

  // Función para iniciar/detener la grabación de audio
  const toggleAudioRecording = async () => {
    if (isRecording) {
      // Detener grabación
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
    } else {
      try {
        // Iniciar grabación
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/wav",
          });
          const audioUrl = URL.createObjectURL(audioBlob);

          // Agregar la grabación a los archivos adjuntos
          const newAudioAttachment: Attachment = {
            id: generateId(),
            type: "audio",
            name: `Grabación de audio ${new Date().toLocaleTimeString()}.wav`,
            url: audioUrl,
            blob: audioBlob,
          };

          setAttachments((prev) => [...prev, newAudioAttachment]);

          // Detener todas las pistas del stream
          stream.getTracks().forEach((track) => track.stop());

          // Reiniciar el contador
          setRecordingTime(0);
        };

        mediaRecorder.start();
        setIsRecording(true);

        // Iniciar contador de tiempo
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } catch (err) {
        console.error("Error al acceder al micrófono:", err);
        setError("No se pudo acceder al micrófono. Verifica los permisos.");
      }
    }
  };

  // Función para renderizar el icono de archivo según su tipo
  const renderFileIcon = (type: FileType) => {
    switch (type) {
      case "image":
        return <ImageIcon className="w-5 h-5" />;
      case "audio":
        return <Music className="w-5 h-5" />;
      case "video":
        return <Film className="w-5 h-5" />;
      case "document":
        return <FileText className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  // Función para renderizar la vista previa de archivos adjuntos
  const renderAttachmentPreview = (attachment: Attachment) => {
    return (
      <div
        key={attachment.id}
        className="relative group flex items-center p-2 rounded-md bg-gray-100 mb-2 mr-2"
      >
        <div className="flex items-center">
          {renderFileIcon(attachment.type)}
          <span className="ml-2 text-sm truncate max-w-[150px]">
            {attachment.name}
          </span>
        </div>
        <button
          type="button"
          onClick={() => removeAttachment(attachment.id)}
          className="ml-2 text-gray-500 hover:text-red-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  };

  // Función para renderizar archivos adjuntos en mensajes
  const renderMessageAttachment = (attachment: Attachment) => {
    switch (attachment.type) {
      case "image":
        return (
          <div key={attachment.id} className="mt-2 rounded-md overflow-hidden">
            <img
              src={attachment.url || "/placeholder.svg"}
              alt={attachment.name}
              className="max-w-full max-h-[200px] object-contain"
            />
          </div>
        );
      case "audio":
        return (
          <div key={attachment.id} className="mt-2">
            <audio controls className="w-full">
              <source src={attachment.url} type="audio/wav" />
              Tu navegador no soporta la reproducción de audio.
            </audio>
          </div>
        );
      case "video":
        return (
          <div key={attachment.id} className="mt-2 rounded-md overflow-hidden">
            <video controls className="max-w-full max-h-[200px]">
              <source src={attachment.url} type="video/mp4" />
              Tu navegador no soporta la reproducción de video.
            </video>
          </div>
        );
      default:
        return (
          <div
            key={attachment.id}
            className="mt-2 flex items-center p-2 rounded-md bg-gray-200"
          >
            {renderFileIcon(attachment.type)}
            <span className="ml-2 text-sm truncate max-w-[200px]">
              {attachment.name}
            </span>
          </div>
        );
    }
  };
  const sendToWebhook = async (message: Message) => {
  await fetch("https://neuralgeniusai.com/webhook/replicar-botpress", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: "+5491122334455", // Teléfono del usuario
      name: "Juan Pérez",
      flow: "mentoria-personal-branding",
      messages: [
        {
          sender: "user",
          text: message,
        },
      ],
    }),
  });
};


  // Función para manejar el envío del formulario
 const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      id: generateId(),
      timestamp: new Date(),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    };
     // Enviar al webhook de n8n
    await sendToWebhook(userMessage);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachments([]);
    setIsLoading(true);
    setError(null);

    try {
      const attachmentsData = await Promise.all(
        (userMessage.attachments || []).map(async (att) => {
          if (!att.blob) return null;

          const formData = new FormData();
          formData.append("image", att.blob, att.name);

          const res = await fetch(
            "https://fixocargo.neuralgeniusai.com/upload",
            {
              method: "POST",
              body: formData,
            }
          );

          if (!res.ok) throw new Error("Error al subir imagen");

          const data = await res.json();

          return {
            type: att.type || "image",
            mime: att.blob.type,
            name: att.name,
            url: data.url,
          };
        })
      );

      const filteredAttachments = attachmentsData.filter(Boolean);

      let finalText = userMessage.content;
      filteredAttachments.forEach((att) => {
        if (att?.type === "image" && att.url) {
          finalText += `\nURL IMAGEN: ${att.url}`;
        }
      });

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: `user-${userMessage.id}`,
          messageId: userMessage.id,
          conversationId: conversationId || `conv-${userMessage.id}`,
          text: finalText,
          attachments: filteredAttachments,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }

      const responseData = await response.json();

      if (
        responseData.conversationId &&
        (!conversationId || conversationId !== responseData.conversationId)
      ) {
        setConversationId(responseData.conversationId);
      }

      if (responseData.botMessage) {
        const botMessage = responseData.botMessage;
        const timestamp = botMessage.timestamp
          ? new Date(botMessage.timestamp)
          : new Date();

        const assistantMessage: Message = {
          role: "assistant",
          content: botMessage.content,
          id: botMessage.id || `bot-${Date.now()}`,
          timestamp,
          attachments: botMessage.attachments,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Error al comunicarse con la API:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Error al comunicarse con el servicio"
      );
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="container flex items-center justify-between h-16 px-4 mx-auto">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#7824cc]">
              <span className="text-white font-bold">N</span>
            </div>
            <h1 className="text-xl font-bold text-[#03021c]">{TITLE_PAGE}</h1>
          </div>
          <Button variant="ghost" size="icon">
            <ChevronDown className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="container max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-center">
              <div className="w-20 h-20 mb-6 rounded-full bg-[#7824cc] flex items-center justify-center">
                <span className="text-3xl font-bold text-white">N</span>
              </div>
              <h2 className="mb-2 text-2xl font-bold text-[#03021c]">
                Bienvenido a NeuralGenius AI
              </h2>
              <p className="max-w-md text-gray-600">
                Esta es una versión de prueba de nuestra plataforma de chat AI.
                Haz una pregunta para comenzar la conversación.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex mb-4 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <Card
                  className={`p-4 max-w-[80%] ${
                    message.role === "user"
                      ? "bg-[#7824cc] text-white"
                      : "bg-gray-100 text-[#03021c]"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    {message.role !== "user" && (
                      <Avatar className="w-8 h-8 bg-[#03021c] text-white">
                        <span className="text-xs font-bold"></span>
                      </Avatar>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-semibold">
                          {message.role === "user" ? "Tú" : AGENT_NAME}
                        </span>
                        <span className="text-xs opacity-70">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>

                      {/* Renderizar archivos adjuntos si existen */}
                      {message.attachments &&
                        message.attachments.length > 0 && (
                          <div className="mt-2">
                            {message.attachments.map((attachment) =>
                              renderMessageAttachment(attachment)
                            )}
                          </div>
                        )}
                    </div>
                    {message.role === "user" && (
                      <Avatar className="w-8 h-8 bg-[#03021c] text-white">
                        <span className="text-xs font-bold"></span>
                      </Avatar>
                    )}
                  </div>
                </Card>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start mb-4">
              <Card className="p-4 max-w-[80%] bg-gray-100 text-[#03021c]">
                <div className="flex items-start space-x-3">
                  <Avatar className="w-8 h-8 bg-[#03021c] text-white">
                    <span className="text-xs font-bold"></span>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-semibold">
                        {AGENT_NAME}
                      </span>
                      <span className="text-xs opacity-70">
                        {formatTime(new Date())}
                      </span>
                    </div>
                    <div className="flex space-x-2">
                      <div
                        className="w-2 h-2 bg-[#7824cc] rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-[#7824cc] rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-[#7824cc] rounded-full animate-bounce"
                        style={{ animationDelay: "600ms" }}
                      ></div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 z-10 w-full p-4 bg-white border-t border-gray-200">
        <div className="container max-w-4xl mx-auto">
          {/* Área de archivos adjuntos */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap">
              {attachments.map((attachment) =>
                renderAttachmentPreview(attachment)
              )}
            </div>
          )}

          {/* Área de grabación de audio */}
          {isRecording && (
            <div className="mb-2 p-2 bg-red-50 rounded-md flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse mr-2"></div>
                <span className="text-sm text-red-500">
                  Grabando audio... {formatRecordingTime(recordingTime)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleAudioRecording}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-center space-x-2">
            {/* Input para archivos oculto */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              multiple
            />

            {/* Botón para adjuntar archivos */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleAttachmentClick}
              className="text-gray-500 hover:text-[#7824cc]"
            >
              <Paperclip className="w-5 h-5" />
            </Button>

            {/* Botón para grabar audio */}
            <Button
              type="button"
              variant={isRecording ? "destructive" : "ghost"}
              size="icon"
              onClick={toggleAudioRecording}
              className={
                isRecording
                  ? "text-white"
                  : "text-gray-500 hover:text-[#7824cc]"
              }
            >
              <Mic className="w-5 h-5" />
            </Button>

            {/* Input de texto */}
            <Input
              value={input}
              onChange={handleInputChange}
              placeholder="Escribe un mensaje..."
              className="flex-1 border-gray-300 focus:ring-[#7824cc] focus:border-[#7824cc]"
              disabled={isRecording}
            />

            {/* Botón de envío */}
            <Button
              type="submit"
              disabled={
                isLoading ||
                (!input.trim() && attachments.length === 0) ||
                isRecording
              }
              className="bg-[#7824cc] hover:bg-[#6a20b3] text-white"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>

          {error && (
            <div className="mt-2 text-sm text-red-500 text-center">
              Error: {error}
            </div>
          )}
          <div className="mt-2 text-xs text-center text-gray-500">
            Versión de prueba para clientes de NeuralGenius
          </div>

          {/* Indicador de ID de conversación (opcional, puedes quitar esto) */}
          {conversationId && (
            <div className="mt-1 text-xs text-center text-gray-400">
              ID de conversación: {conversationId}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
