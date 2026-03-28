export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/contact' && request.method === 'POST') {
      try {
        const { name, email, message, turnstileToken } = await request.json();

        if (!name || !email || !message) {
          return Response.json({ error: 'All fields are required.' }, { status: 400 });
        }

        if (!turnstileToken) {
          return Response.json({ error: 'Verification required.' }, { status: 400 });
        }

        const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: turnstileToken }),
        });
        const turnstileData = await turnstileRes.json();
        if (!turnstileData.success) {
          return Response.json({ error: 'Verification failed.' }, { status: 403 });
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
