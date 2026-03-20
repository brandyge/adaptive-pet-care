export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact' && request.method === 'POST') {
      try {
        const { name, email, message } = await request.json();

        if (!name || !email || !message) {
          return Response.json({ error: 'All fields are required.' }, { status: 400 });
        }

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `Sunset Paws Contact <noreply@sunsetpaws.pet>`,
            to: 'requests@sunsetpaws.pet',
            subject: `Contact form: ${name}`,
            reply_to: email,
            text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
          }),
        });

        if (!res.ok) {
          const body = await res.text();
          console.error('Resend API error:', res.status, body);
          return Response.json({ error: 'Failed to send message.' }, { status: 502 });
        }

        return Response.json({ success: true });
      } catch (err) {
        console.error('Contact form error:', err);
        return Response.json({ error: 'Invalid request.' }, { status: 400 });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
