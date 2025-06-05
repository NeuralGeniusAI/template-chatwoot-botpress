import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    console.log("Payload recibido de Botpress:", JSON.stringify(data, null, 2));

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error leyendo payload:", error);
    return NextResponse.json({ error: "Error leyendo payload" }, { status: 500 });
  }
}
