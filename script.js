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

// Contact form mailto
const contactForm = document.getElementById('contactForm');
contactForm?.addEventListener('submit', e => {
  e.preventDefault();
  const fd = new FormData(contactForm);
  const name = (fd.get('name') || '').toString();
  const company = (fd.get('company') || '').toString();
  const email = (fd.get('email') || '').toString();
  const message = (fd.get('message') || '').toString();

  const subject = encodeURIComponent(`FinShield Contact — ${name}${company ? ' ('+company+')' : ''}`);
  const body = encodeURIComponent([
    `Name: ${name}`,
    `Company: ${company || '—'}`,
    `Email: ${email}`,
    '',
    'Message:',
    message
  ].join('\n'));

  window.location.href = `mailto:finshield@outlook.com?subject=${subject}&body=${body}`;
});
