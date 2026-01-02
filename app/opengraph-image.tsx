import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Rodrigo Bermejo | Automatización de Negocios';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  // Font loading skipped for simplicity in this artifact,
  // but normally you'd load fetch/fs fonts here.

  return new ImageResponse(
    (
      <div
        style={{
          background: '#14537e',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 20, opacity: 0.8 }}>CONSULTOR TÉCNICO</div>
        <div style={{ fontSize: 80, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
          RODRIGO BERMEJO
        </div>
        <div style={{ fontSize: 30, backgroundColor: '#11abb0', padding: '10px 30px', borderRadius: 10 }}>
          Sistemas que eliminan el caos
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
