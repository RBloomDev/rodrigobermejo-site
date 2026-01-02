import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, source } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Email inválido" },
        { status: 400 }
      );
    }

    // Aquí iría la lógica para guardar en DB o enviar a servicio de email (e.g. ConvertKit, Mailchimp)
    // Por ahora, solo logueamos para cumplir el requerimiento de "captura simple"
    console.log(`[NEW SUBSCRIBER] Email: ${email} | Source: ${source} | Date: ${new Date().toISOString()}`);

    // Simulamos un delay para UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Subscription Error:", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
