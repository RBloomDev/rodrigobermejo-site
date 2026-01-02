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

    const API_KEY = process.env.BUTTONDOWN_API_KEY;

    if (!API_KEY) {
      console.error("Missing BUTTONDOWN_API_KEY");
      return NextResponse.json(
        { error: "Configuration Error" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.buttondown.com/v1/subscribers", {
      method: "POST",
      headers: {
        Authorization: `Token ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email_address: email,
        tags: ["newsletter", source || "unknown"],
        metadata: { source },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Buttondown Error:", errorData);
      return NextResponse.json(
        { error: "Error al suscribir" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("Buttondown success:", data);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Subscription Error:", error);
    return NextResponse.json(
      { error: "Error interno" },
      { status: 500 }
    );
  }
}
