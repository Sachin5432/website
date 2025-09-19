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

openers.forEach(btn => btn.addEventListener('click', () => {
  modal.showModal();
  resetDemoFlow();
}));
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

// Demo scheduler + submit (no email popup)
const demoForm = document.getElementById('demoForm');
const demoSubmitBtn = document.getElementById('demoSubmitBtn');
const stepSchedule = document.getElementById('demoStepSchedule');
const stepInfo = document.getElementById('demoStepInfo');
const stepThanks = document.getElementById('demoThanks');
const selectedDateInput = document.getElementById('demoSelectedDate');
const selectedDateSummary = document.getElementById('selectedDateSummary');
const demoBackBtn = document.getElementById('demoBackBtn');
const calTitle = document.getElementById('calTitle');
const calGrid = document.getElementById('calGrid');
const calPrev = document.getElementById('calPrev');
const calNext = document.getElementById('calNext');

let calMonth = new Date(); // tracks the visible month
let chosenDate = null; // Date object for selected day

function startOfMonth(d){ return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d){ return new Date(d.getFullYear(), d.getMonth()+1, 0); }
function ymd(d){ return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function monthTitle(d){ return d.toLocaleString(undefined, { month: 'long', year: 'numeric' }); }

function renderCalendar(){
  const first = startOfMonth(calMonth);
  const last = endOfMonth(calMonth);
  const today = new Date(); today.setHours(0,0,0,0);
  calTitle.textContent = monthTitle(calMonth);
  calGrid.innerHTML = '';
  const startDow = first.getDay();
  // blanks
  for (let i=0; i<startDow; i++) {
    const div = document.createElement('div');
    div.className = 'cal-day is-disabled';
    div.setAttribute('aria-disabled','true');
    calGrid.appendChild(div);
  }
  // days
  for (let day=1; day<=last.getDate(); day++){
    const d = new Date(calMonth.getFullYear(), calMonth.getMonth(), day);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-day';
    btn.textContent = String(day);
    btn.setAttribute('aria-label', d.toDateString());
    const isPast = d < today;
    if (isPast) {
      btn.classList.add('is-disabled');
      btn.disabled = true;
    }
    if (chosenDate && ymd(d) === ymd(chosenDate)) {
      btn.classList.add('is-selected');
    }
    if (ymd(d) === ymd(today)) {
      btn.classList.add('is-today');
    }
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      chosenDate = d;
      selectedDateInput.value = ymd(chosenDate);
      // show info step immediately
      setDemoStep('info');
      renderCalendar(); // re-render to reflect selection
    });
    calGrid.appendChild(btn);
  }
}

function setDemoStep(which){
  if (which === 'schedule') {
    stepSchedule.style.display = '';
    stepInfo.style.display = 'none';
    stepThanks.style.display = 'none';
    demoSubmitBtn.disabled = true;
    if (demoBackBtn) demoBackBtn.style.display = 'none';
  } else if (which === 'info') {
    stepSchedule.style.display = 'none';
    stepInfo.style.display = '';
    stepThanks.style.display = 'none';
    demoSubmitBtn.disabled = false;
    if (chosenDate) {
      selectedDateSummary.innerHTML = `<strong>Selected date:</strong> ${chosenDate.toLocaleDateString()} <button type="button" class="change-link" id="changeDemoDateBtn">Change</button>`;
      // Bind change handler to go back to calendar
      const changeBtn = document.getElementById('changeDemoDateBtn');
      changeBtn && changeBtn.addEventListener('click', () => setDemoStep('schedule'));
    } else {
      selectedDateSummary.textContent = '';
    }
    if (demoBackBtn) demoBackBtn.style.display = '';
    // focus first field
    const firstInput = stepInfo.querySelector('input[name="name"]');
    firstInput && firstInput.focus();
  } else if (which === 'thanks') {
    stepSchedule.style.display = 'none';
    stepInfo.style.display = 'none';
    stepThanks.style.display = '';
    demoSubmitBtn.disabled = true;
    if (demoBackBtn) demoBackBtn.style.display = 'none';
  }
}

function resetDemoFlow(){
  chosenDate = null;
  selectedDateInput.value = '';
  selectedDateSummary.textContent = '';
  demoForm.reset();
  calMonth = new Date();
  renderCalendar();
  setDemoStep('schedule');
}

calPrev?.addEventListener('click', () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth()-1, 1); renderCalendar(); });
calNext?.addEventListener('click', () => { calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 1); renderCalendar(); });

demoBackBtn?.addEventListener('click', () => setDemoStep('schedule'));

async function sendDemoRequest(payload){
  const endpoint = 'https://formsubmit.co/ajax/finshield@outlook.com';
  const fd = new FormData();
  fd.set('name', payload.name);
  fd.set('email', payload.email);
  fd.set('org', payload.org);
  fd.set('date', payload.date);
  fd.set('time', payload.time);
  fd.set('tz', payload.tz);
  fd.set('notes', payload.notes);
  fd.set('_subject', `FinShield Demo Request — ${payload.name}${payload.org ? ' ('+payload.org+')' : ''}`);
  fd.set('_captcha', 'false');
  fd.set('_template', 'table');

  const resp = await fetch(endpoint, { method: 'POST', headers: { 'Accept': 'application/json' }, body: fd });
  if (!resp.ok) throw new Error('Network error');
  const data = await resp.json();
  if (!(data.success === 'true' || data.success === true)) throw new Error(data.message || 'Send failed');
}

demoForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  // ensure we are on info step and valid
  if (!selectedDateInput.value) {
    setDemoStep('schedule');
    return;
  }
  if (demoForm.checkValidity && !demoForm.checkValidity()) {
    demoForm.reportValidity && demoForm.reportValidity();
    return;
  }
  const data = new FormData(demoForm);
  const name = (data.get('name')||'').toString();
  const email = (data.get('email')||'').toString();
  const org = (data.get('org')||'').toString();
  const date = (data.get('date')||'').toString();
  const time = (data.get('time')||'').toString();
  const tz = (data.get('tz')||'').toString();
  const notes = (data.get('notes')||'').toString();

  const submitBtn = demoSubmitBtn;
  const originalText = submitBtn?.textContent;
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }

  try {
    await sendDemoRequest({ name, email, org, date, time, tz, notes });
    // show thanks, then reset to schedule after 3s
    setDemoStep('thanks');
    setTimeout(() => { resetDemoFlow(); }, 3000);
  } catch (err) {
    // Fallback: no-cors post so it works from file:// and still show thanks
    try {
      const fd = new FormData();
      fd.set('name', name);
      fd.set('email', email);
      fd.set('org', org);
      fd.set('date', date);
      fd.set('time', time);
      fd.set('tz', tz);
      fd.set('notes', notes);
      fd.set('_subject', `FinShield Demo Request — ${name}${org ? ' ('+org+')' : ''}`);
      fd.set('_captcha', 'false');
      fd.set('_template', 'table');
      await fetch('https://formsubmit.co/finshield@outlook.com', { method:'POST', mode:'no-cors', body: fd });
      setDemoStep('thanks');
      setTimeout(() => { resetDemoFlow(); }, 3000);
    } catch (err2) {
      // If even that fails, keep the modal open and show a small inline message
      alert('Sorry, we could not send your request automatically. Please email us at finshield@outlook.com.');
    }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText || 'Send request'; }
  }
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
