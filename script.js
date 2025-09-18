// Smooth scroll for internal links
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const el = document.querySelector(id);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.pushState(null, '', id);
    }
  });
});

// Demo modal logic
const modal = document.getElementById('demoModal');
const openers = document.querySelectorAll('[data-open-demo]');
const closers = document.querySelectorAll('[data-close]');

openers.forEach(btn => btn.addEventListener('click', () => modal.showModal()));
closers.forEach(btn => btn.addEventListener('click', () => modal.close()));

// Helpers
function pad(n){ return String(n).padStart(2,'0'); }
function fmtICS(dt){
  // Returns YYYYMMDDTHHMMSSZ for Google
  return [dt.getUTCFullYear(), pad(dt.getUTCMonth()+1), pad(dt.getUTCDate())].join('') +
         'T' + [pad(dt.getUTCHours()), pad(dt.getUTCMinutes()), pad(dt.getUTCSeconds())].join('') + 'Z';
}
function fmtISO(dt){
  // Returns YYYY-MM-DDTHH:MM:SSZ for Outlook
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth()+1)}-${pad(dt.getUTCDate())}`+
         `T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}:${pad(dt.getUTCSeconds())}Z`;
}

// Mailto composition on submit (+ calendar links)
const form = document.getElementById('demoForm');
form?.addEventListener('submit', e => {
  e.preventDefault();
  const data = new FormData(form);
  const name = (data.get('name') || '').toString();
  const email = (data.get('email') || '').toString();
  const org = (data.get('org') || '').toString();
  const date = (data.get('date') || '').toString();
  const time = (data.get('time') || '').toString();
  const tz = (data.get('tz') || '').toString();
  const notes = (data.get('notes') || '').toString();

  // Build calendar links (1 hour slot)
  let gcalLink = '', outlookLink = '';
  if (date && time) {
    const startLocal = new Date(`${date}T${time}`); // interpreted as local time
    const endLocal = new Date(startLocal.getTime() + 60*60*1000);
    const title = 'FinShield Demo';
    const details = `Requested by ${name} (${email})%0AOrg: ${encodeURIComponent(org || '-')}`;

    const gStart = fmtICS(startLocal);
    const gEnd = fmtICS(endLocal);
    gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${gStart}%2F${gEnd}&details=${details}`;

    const oStart = fmtISO(startLocal);
    const oEnd = fmtISO(endLocal);
    outlookLink = `https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(title)}&startdt=${encodeURIComponent(oStart)}&enddt=${encodeURIComponent(oEnd)}&body=${details}`;
  }

  const subject = encodeURIComponent(`FinShield Demo Request — ${name} (${org || 'No org'})`);
  const body = encodeURIComponent(
    [
      `Name: ${name}`,
      `Email: ${email}`,
      `Organization: ${org || '—'}`,
      `Preferred slot: ${date || '—'} ${time || ''} ${tz || ''}`.trim(),
      '',
      'Notes:',
      notes || '—',
      '',
      'Add to calendar:',
      gcalLink ? `Google: ${gcalLink}` : 'Google: (link will be created once date/time are set)',
      outlookLink ? `Outlook: ${outlookLink}` : 'Outlook: (link will be created once date/time are set)'
    ].join('\n')
  );

  window.location.href = `mailto:finshield@outlook.com?subject=${subject}&body=${body}`;
  setTimeout(() => modal.close(), 200);
});

// Contact form: async submit via FormSubmit (no email client popup)
const contactForm = document.getElementById('contactForm');
const isFileOrigin = typeof location !== 'undefined' && location.protocol === 'file:';

// Create a status line after the form once (for inline messages)
let contactStatus = null;
if (contactForm) {
  contactForm.insertAdjacentHTML('afterend', '<p id="contactStatus" class="contact-status" aria-live="polite" style="margin-top:8px;"></p>');
  contactStatus = document.getElementById('contactStatus');
}

async function sendContactMessage({ name, company, email, message }) {
  // Sends using https://formsubmit.co
  // Note: The first submission may send a verification email to finshield@outlook.com.
  const endpoint = 'https://formsubmit.co/ajax/finshield@outlook.com';
  const fd = new FormData();
  fd.set('name', name);
  fd.set('company', company);
  fd.set('email', email);
  fd.set('message', message);
  fd.set('_subject', `FinShield Contact — ${name}${company ? ' ('+company+')' : ''}`);
  fd.set('_captcha', 'false');
  fd.set('_template', 'table');

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Accept': 'application/json' },
    body: fd
  });
  if (!resp.ok) throw new Error('Network error');
  const data = await resp.json();
  if (!(data.success === 'true' || data.success === true)) {
    throw new Error(data.message || 'Send failed');
  }
}

contactForm?.addEventListener('submit', async e => {
  e.preventDefault();
  // Manual validation since form has novalidate
  if (contactForm.checkValidity && !contactForm.checkValidity()) {
    if (contactForm.reportValidity) contactForm.reportValidity();
    return;
  }
  const fd = new FormData(contactForm);
  const name = (fd.get('name') || '').toString();
  const company = (fd.get('company') || '').toString();
  const email = (fd.get('email') || '').toString();
  const message = (fd.get('message') || '').toString();

  const submitBtn = contactForm.querySelector('button[type="submit"]');
  const originalText = submitBtn?.textContent;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';
  }

  try {
    contactStatus && (contactStatus.textContent = '');
    await sendContactMessage({ name, company, email, message });

    // Success UI: clear and replace form with thank-you
    contactForm.reset();
    contactForm.style.display = 'none';

    const thanks = document.createElement('div');
    thanks.className = 'contact-success';
    thanks.innerHTML = '<h3>Thanks!</h3><p>Your message has been sent. We\'ll get back to you soon.</p>';
    const container = contactForm.parentElement;
    container?.appendChild(thanks);

    // After 3 seconds, restore form view
    setTimeout(() => {
      thanks.remove();
      contactForm.style.display = '';
    }, 3000);
  } catch (err) {
    // Fallback: try posting with no-cors to avoid CORS issues on file://
    try {
      const fd2 = new FormData();
      fd2.set('name', name);
      fd2.set('company', company);
      fd2.set('email', email);
      fd2.set('message', message);
      fd2.set('_subject', `FinShield Contact — ${name}${company ? ' ('+company+')' : ''}`);
      fd2.set('_captcha', 'false');
      fd2.set('_template', 'table');
      await fetch('https://formsubmit.co/finshield@outlook.com', { method: 'POST', mode: 'no-cors', body: fd2 });

      // Treat as sent and show temporary thanks
      contactForm.reset();
      contactForm.style.display = 'none';
      const thanks = document.createElement('div');
      thanks.className = 'contact-success';
      thanks.innerHTML = '<h3>Thanks!</h3><p>Your message has been sent. We\'ll get back to you soon.</p>';
      const container = contactForm.parentElement;
      container?.appendChild(thanks);
      setTimeout(() => {
        thanks.remove();
        contactForm.style.display = '';
      }, 3000);
    } catch (err2) {
      // Show inline error (no popup), with fallback email link
      if (contactStatus) {
        contactStatus.innerHTML = 'Sorry, we could not send your message automatically. Please email us at <a href="mailto:finshield@outlook.com">finshield@outlook.com</a>.';
      }
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalText || 'Send message';
    }
  }
});
