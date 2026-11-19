// Shared helpers for /start, /demo and /signup.
// Demo bookings go straight onto Lloyd's Journey sales calendar (website-hub edge function).
(function () {
  var FN = 'https://gatndtsmjrxdgxquvydw.supabase.co/functions/v1/website-hub';
  var ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdhdG5kdHNtanJ4ZGd4cXV2eWR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMzMDgzMjMsImV4cCI6MjA5ODg4NDMyM30._JpUIXueoySXdlk_6pNQ_hXzoDlsqsUriNShn5HGVmo';
  var PHONE = '(352) 484-6341';

  function api(body) {
    return fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: 'Bearer ' + ANON }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, error: 'Something went wrong.' }; }); })
      .catch(function () { return { ok: false, error: 'Couldn\'t reach Journey. Check your connection, or call ' + PHONE + '.' }; });
  }
  function el(tag, attrs, html) { var e = document.createElement(tag); for (var k in (attrs || {})) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var localTz = (Intl.DateTimeFormat().resolvedOptions().timeZone || '');
  var eastern = /^America\/(New_York|Detroit|Toronto|Indiana\/Indianapolis|Kentucky\/Louisville)$/.test(localTz);
  function localLabel(iso) { return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }); }
  function dayParts(d) { var x = new Date(d + 'T12:00:00Z'); return { wd: x.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }), n: x.getUTCDate(), mo: x.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }), long: x.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' }) }; }

  // Booking widget. opts: { purpose: 'demo'|'onboarding', lead: {id,name,company,email,phone,team,language} (skips the contact form), onDone(when) }
  function mountBooking(root, opts) {
    opts = opts || {};
    var lead = opts.lead || null, state = { days: [], day: null, slot: null, label: '' };
    root.innerHTML = '';
    var left = el('div', { class: 'panel' }, '<h3>1 · Pick a day and time</h3><div class="days" role="listbox" aria-label="Day"></div><div class="times"></div><div class="tz"></div>');
    var right = el('div', { class: 'panel' });
    var grid = el('div', { class: 'book' }); grid.appendChild(left); grid.appendChild(right); root.appendChild(grid);
    var daysEl = left.querySelector('.days'), timesEl = left.querySelector('.times'), tzEl = left.querySelector('.tz');
    tzEl.textContent = 'Times shown in Eastern Time (Ocala, FL). Every call is set for an hour; it can run longer if you need.' + (eastern ? '' : ' Your local time is shown when you pick a slot.');

    function renderRight() {
      var pick = state.slot ? '<div class="picked">📅 ' + esc(dayParts(state.day).long) + ' at ' + esc(state.label) + ' Eastern' + (eastern ? '' : ' <span style="font-weight:500">(' + esc(localLabel(state.slot)) + ' your time)</span>') + '</div>' : '<div class="picked" style="background:#F2F2F2;color:#5C6B7A">Pick a time on the left.</div>';
      if (lead) {
        right.innerHTML = '<h3>2 · Confirm your setup call</h3>' + pick +
          '<p style="font-size:14px;color:#5C6B7A;margin-top:8px">Lloyd will call <b>' + esc(lead.name) + '</b> at <b>' + esc(lead.phone) + '</b>. We\'ll email the confirmation to ' + esc(lead.email) + '.</p>' +
          '<form class="fm" onsubmit="return false"><label class="chk"><input type="checkbox" id="bk_rem" checked> Send me a confirmation and reminders (the day before and an hour before) by text or email. Msg &amp; data rates may apply; reply STOP to opt out.</label>' +
          '<button class="btn solid wide" id="bk_go"' + (state.slot ? '' : ' disabled') + '>Book my setup call</button><div class="msg" id="bk_msg"></div></form>';
      } else {
        right.innerHTML = '<h3>2 · Tell us who to call</h3>' + pick +
          '<form class="fm" onsubmit="return false" autocomplete="on">' +
          '<div class="r2"><div><label for="bk_name">Your name *</label><input id="bk_name" autocomplete="name"></div><div><label for="bk_title">Title</label><input id="bk_title" autocomplete="organization-title" placeholder="e.g. Owner, Office manager"></div></div>' +
          '<label for="bk_company">Company</label><input id="bk_company" autocomplete="organization">' +
          '<div class="r2"><div><label for="bk_phone">Phone *</label><input id="bk_phone" type="tel" autocomplete="tel" placeholder="(352) 555-0123"></div><div><label for="bk_email">Email *</label><input id="bk_email" type="email" autocomplete="email"></div></div>' +
          '<div class="r2"><div><label for="bk_team">Team size</label><select id="bk_team"><option value="">Choose…</option><option>Just me +1</option><option>2-5 people</option><option>6-10 people</option><option>11-15 people</option><option>16 or more</option></select></div>' +
          '<div><label for="bk_lang">Language</label><select id="bk_lang"><option>English</option><option value="Spanish">Español</option></select></div></div>' +
          '<label for="bk_msg_in">Special interests</label><textarea id="bk_msg_in" rows="2" placeholder="What would you most like to see? e.g. dispatch, the AI receptionist, estimates"></textarea>' +
          '<div class="hp" aria-hidden="true"><label>Website<input id="bk_web" tabindex="-1" autocomplete="off"></label></div>' +
          '<label class="chk"><input type="checkbox" id="bk_rem" checked> Send me a confirmation and reminders (the day before and an hour before) by text or email. Msg &amp; data rates may apply; reply STOP to opt out.</label>' +
          '<button class="btn solid wide" id="bk_go"' + (state.slot ? '' : ' disabled') + '>Book my demo</button><div class="msg" id="bk_msg"></div></form>';
      }
      right.querySelector('#bk_go').addEventListener('click', submit);
    }
    function v(id) { var x = right.querySelector('#' + id); return x ? x.value.trim() : ''; }
    function show(t, ok) { var m = right.querySelector('#bk_msg'); m.className = 'msg ' + (ok ? 'ok' : 'err'); m.textContent = t; }
    function submit() {
      if (!state.slot) return;
      var body = { action: 'book', slot: state.slot, purpose: opts.purpose || 'demo', reminders_ok: right.querySelector('#bk_rem').checked };
      if (lead) { body.lead_id = lead.id; body.name = lead.name; body.company = lead.company; body.email = lead.email; body.phone = lead.phone; body.team = lead.team; body.language = lead.language; }
      else {
        body.name = v('bk_name'); body.title = v('bk_title'); body.company = v('bk_company'); body.phone = v('bk_phone'); body.email = v('bk_email'); body.team = v('bk_team'); body.language = v('bk_lang'); body.message = v('bk_msg_in'); body.website = v('bk_web');
        if (!body.name) return show('Please enter your name.');
        if (String(body.phone).replace(/\D/g, '').length < 10) return show('Please enter a 10-digit phone number so Lloyd can call you.');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) return show('Please enter a valid email.');
      }
      var b = right.querySelector('#bk_go'); b.disabled = true; b.textContent = 'Booking…';
      api(body).then(function (d) {
        if (d && d.ok) {
          root.innerHTML = '<div class="panel done"><div class="big">✅</div><h3>You\'re booked.</h3><p>Lloyd will call you <b>' + esc(d.when || '') + '</b> (Eastern).</p>' +
            (body.reminders_ok ? '<p style="margin-top:6px">A confirmation is on its way, with reminders before the call.</p>' : '') +
            '<p style="margin-top:14px">Need a different time? Call or text <a href="tel:+13524846341"><b>' + PHONE + '</b></a>.</p></div>';
          if (opts.onDone) opts.onDone(d.when);
          return;
        }
        b.disabled = false; b.textContent = lead ? 'Book my setup call' : 'Book my demo';
        show((d && d.error) || 'Something went wrong. Please try again.');
        if (d && d.taken) load();
      });
    }
    function renderTimes() {
      var day = state.days.filter(function (x) { return x.day === state.day; })[0];
      timesEl.innerHTML = '';
      if (!day) return;
      day.slots.forEach(function (s) {
        var t = el('button', { class: 'time' + (state.slot === s.slot ? ' on' : ''), type: 'button', title: eastern ? '' : localLabel(s.slot) + ' your time' }, esc(s.label));
        t.addEventListener('click', function () { state.slot = s.slot; state.label = s.label; renderTimes(); renderRight(); });
        timesEl.appendChild(t);
      });
    }
    function renderDays() {
      daysEl.innerHTML = '';
      state.days.forEach(function (d) {
        var p = dayParts(d.day);
        var b = el('button', { class: 'day' + (d.day === state.day ? ' on' : ''), type: 'button' }, '<b>' + p.wd + '</b><span>' + p.n + '</span><b>' + p.mo + '</b>');
        b.addEventListener('click', function () { state.day = d.day; state.slot = null; renderDays(); renderTimes(); renderRight(); });
        daysEl.appendChild(b);
      });
    }
    function load() {
      timesEl.innerHTML = '<div class="empty">Loading open times…</div>';
      api({ action: 'slots' }).then(function (d) {
        state.days = (d && d.days) || [];
        if (!state.days.length) { daysEl.innerHTML = ''; timesEl.innerHTML = '<div class="empty">No open times online right now — call <a href="tel:+13524846341"><b>' + PHONE + '</b></a> and we\'ll set one up.</div>'; return; }
        if (!state.days.some(function (x) { return x.day === state.day; })) state.day = state.days[0].day;
        state.slot = null; renderDays(); renderTimes(); renderRight();
      });
    }
    renderRight(); load();
  }

  window.JourneyHub = { api: api, mountBooking: mountBooking, esc: esc, PHONE: PHONE };
})();
