import './styles/global.css'
import './styles/style.css'

const form = document.getElementById('contact-form')
if (form) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = form.querySelector('button[type="submit"]')
    btn.disabled = true
    btn.textContent = 'Sending…'

    try {
      const formData = new FormData(form)
      const turnstileToken = formData.get('cf-turnstile-response')
      const data = Object.fromEntries(formData)
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, email: data.email, message: data.message, turnstileToken }),
      })

      if (res.ok) {
        form.innerHTML = '<p class="contact-success">Thanks! Your message has been sent.</p>'
      } else {
        const { error } = await res.json()
        btn.disabled = false
        btn.textContent = 'Send'
        alert(error || 'Something went wrong. Please try again.')
      }
    } catch {
      btn.disabled = false
      btn.textContent = 'Send'
      alert('Network error. Please try again.')
    }
  })
}
