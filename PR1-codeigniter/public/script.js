(function(){

    const views = {
    guest: document.getElementById('view-guest'),
    login: document.getElementById('view-login'),
    register: document.getElementById('view-register'),
    account: document.getElementById('view-account')
  };
  const footer = document.getElementById('siteFooter');

  function showView(name, opts){
    opts = opts || {};
    if(name === 'account' && !currentUser){ name = 'login'; }
    if(name === 'account'){ renderAccount(); }
    Object.keys(views).forEach(function(key){
      views[key].classList.toggle('hidden', key !== name);
    });
    footer.classList.toggle('hidden', name !== 'guest');
    if(name === 'guest' && window.__layoutProjects){ requestAnimationFrame(window.__layoutProjects); }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  window.__sunSonShowView = showView;

    const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');

  function closeMobileNav(){
    mainNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  navToggle.addEventListener('click', function(){
    const open = mainNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  document.getElementById('brandLink').addEventListener('click', function(){
    closeMobileNav();
    showView('guest');
  });

  document.querySelectorAll('.main-nav a:not([data-goto])').forEach(function(link){
    link.addEventListener('click', function(){
      closeMobileNav();
    });
  });

    document.querySelectorAll('[data-goto]').forEach(function(el){
    el.addEventListener('click', function(e){
      e.preventDefault();
      closeMobileNav();
      if(el.id === 'navAuth' && currentUser){
        api('/api/logout', 'POST').then(function(){ location.reload(); });
        return;
      }
      showView(el.getAttribute('data-goto'));
    });
  });


  var currentUser = null;
  var FIELD_MAP = {
    firstName:'f-reg-first', lastName:'f-reg-last', birthdate:'f-reg-birthdate',
    gender:'f-reg-gender', email:'f-reg-email', phone:'f-reg-phone',
    address:'f-reg-address', username:'f-reg-username', password:'f-reg-pass',
    confirm:'f-reg-pass2', department:'f-reg-dept',
    loginId:'f-login-id', loginPassword:'f-login-password'
  };

  function api(path, method, body){
    return fetch('.' + path, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined
    }).then(function(res){
      return res.json().catch(function(){
        return { ok:false, errors:{ _form:'Unexpected server response.' } };
      }).then(function(data){ data.status = res.status; return data; });
    });
  }

  function showFormError(form, msg){
    var box = form.querySelector('.form-error');
    if(!box){
      box = document.createElement('div');
      box.className = 'error-msg form-error';
      box.setAttribute('role', 'alert');
      form.insertBefore(box, form.querySelector('button.submit'));
    }
    box.textContent = msg || '';
  }

  function applyServerErrors(form, errors){
    var shown = false;
    Object.keys(errors || {}).forEach(function(k){
      if(FIELD_MAP[k]){ setError(FIELD_MAP[k], errors[k]); }
      else { showFormError(form, errors[k]); }
      shown = true;
    });
    if(!shown) showFormError(form, 'Something went wrong. Please try again.');
  }

  function setBusy(btn, busy){
    btn.disabled = busy;
    if(busy){ btn.dataset.label = btn.textContent; btn.textContent = 'Please wait...'; }
    else if(btn.dataset.label){ btn.textContent = btn.dataset.label; }
  }

  function setUser(u){
    currentUser = u;
    var link = document.getElementById('navAuth');
    if(link) link.textContent = u ? 'Log Out' : 'Log In';
    var ord = document.getElementById('navOrders');
    if(ord) ord.classList.toggle('hidden', !u);
  }

    const loginForm = document.getElementById('loginForm');
  const loginWrap = document.getElementById('formWrapLogin');
  const successLogin = document.getElementById('successLogin');

  function setError(fieldId, msg){
    const field = document.getElementById(fieldId);
    field.classList.toggle('invalid', !!msg);
    const em = field.querySelector('.error-msg');
    if(em) em.textContent = msg || '';
  }

  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    let valid = true;

    const loginId = document.getElementById('loginId').value.trim();
    setError('f-login-id', loginId ? '' : 'Enter your username or email.');
    if(!loginId) valid = false;

    const loginPassword = document.getElementById('loginPassword').value;
    setError('f-login-password', loginPassword ? '' : 'Enter your password.');
    if(!loginPassword) valid = false;

    if(!valid) return;

    var btn = loginForm.querySelector('button.submit');
    showFormError(loginForm, '');
    setBusy(btn, true);
    api('/api/login', 'POST', {
      loginId: loginId,
      loginPassword: loginPassword,
      remember: document.getElementById('remember').checked
    }).then(function(data){
      if(!data.ok){ applyServerErrors(loginForm, data.errors); return; }
      setUser(data);
      setTimeout(function(){ if(currentUser) showView('account'); }, 1200);
      document.getElementById('successLoginCopy').textContent =
        'Welcome back, ' + data.firstName + '. Taking you to your account\u2026';
      loginWrap.classList.add('done');
      successLogin.classList.add('show');
      successLogin.setAttribute('tabindex', '-1');
      successLogin.focus();
    }).catch(function(){
      showFormError(loginForm, 'Cannot reach the server. Check your connection and try again.');
    }).then(function(){ setBusy(btn, false); });
  });

    const regForm = document.getElementById('regForm');
  const regWrap = document.getElementById('formWrapRegister');
  const successRegister = document.getElementById('successRegister');
  const deptField = document.getElementById('f-reg-dept');
  const roleInputs = document.querySelectorAll('input[name="role"]');
  const deptSelect = document.getElementById('regDepartment');

  function syncRole(){
    const isEmployee = document.getElementById('regRoleEmployee').checked;
    deptField.classList.toggle('open', isEmployee);
    deptSelect.required = isEmployee;
    if(!isEmployee){ deptSelect.value = ''; setError('f-reg-dept', ''); }
  }
  roleInputs.forEach(function(r){ r.addEventListener('change', syncRole); });
  syncRole();

  function requireText(id, fieldId, msg){
    const v = document.getElementById(id).value.trim();
    setError(fieldId, v ? '' : msg);
    return !!v;
  }

  regForm.addEventListener('submit', function(e){
    e.preventDefault();
    let valid = true;

    if(!requireText('regFirstName', 'f-reg-first', 'Enter your first name.')) valid = false;
    if(!requireText('regLastName', 'f-reg-last', 'Enter your last name.')) valid = false;

    const birthdate = document.getElementById('regBirthdate').value;
    setError('f-reg-birthdate', birthdate ? '' : 'Enter your birthdate.');
    if(!birthdate) valid = false;

    const gender = document.getElementById('regGender').value;
    setError('f-reg-gender', gender ? '' : 'Choose one.');
    if(!gender) valid = false;

    const email = document.getElementById('regEmail').value.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setError('f-reg-email', emailOk ? '' : 'Enter a valid email.');
    if(!emailOk) valid = false;

    const phone = document.getElementById('regPhone').value.trim();
    setError('f-reg-phone', phone.length >= 7 ? '' : 'Enter a phone number.');
    if(phone.length < 7) valid = false;

    if(!requireText('regAddress', 'f-reg-address', 'Enter your address.')) valid = false;
    if(!requireText('regUsername', 'f-reg-username', 'Choose a username.')) valid = false;

    const pass = document.getElementById('regPassword').value;
    setError('f-reg-pass', pass.length >= 8 ? '' : 'At least 8 characters.');
    if(pass.length < 8) valid = false;

    const confirm = document.getElementById('regConfirm').value;
    setError('f-reg-pass2', (confirm && confirm === pass) ? '' : 'Passwords don\u2019t match.');
    if(!confirm || confirm !== pass) valid = false;

    const isEmployee = document.getElementById('regRoleEmployee').checked;
    if(isEmployee){
      setError('f-reg-dept', deptSelect.value ? '' : 'Choose a department.');
      if(!deptSelect.value) valid = false;
    }

    const terms = document.getElementById('regTerms').checked;
    if(!terms){ valid = false; document.getElementById('regTerms').focus(); }

    if(!valid) return;

    var btn = regForm.querySelector('button.submit');
    showFormError(regForm, '');
    setBusy(btn, true);
    api('/api/register', 'POST', {
      firstName: document.getElementById('regFirstName').value.trim(),
      middleName: document.getElementById('regMiddleName').value.trim(),
      lastName: document.getElementById('regLastName').value.trim(),
      birthdate: birthdate,
      gender: gender,
      email: email,
      phone: phone,
      address: document.getElementById('regAddress').value.trim(),
      username: document.getElementById('regUsername').value.trim(),
      password: pass,
      confirm: confirm,
      role: isEmployee ? 'employee' : 'customer',
      department: isEmployee ? deptSelect.value : '',
      terms: terms
    }).then(function(data){
      if(!data.ok){ applyServerErrors(regForm, data.errors); return; }
      document.getElementById('successRegisterTitle').textContent = 'Welcome, ' + data.firstName + '.';
      document.getElementById('successRegisterCopy').textContent = isEmployee
        ? 'Your staff account is set up. An admin will confirm your ' + (deptSelect.options[deptSelect.selectedIndex].text) + ' department access shortly.'
        : 'Your account is set up. A member of our crew will reach out within one business day about your quote or install.';
      regWrap.classList.add('done');
      successRegister.classList.add('show');
      successRegister.setAttribute('tabindex', '-1');
      successRegister.focus();
    }).catch(function(){
      showFormError(regForm, 'Cannot reach the server. Check your connection and try again.');
    }).then(function(){ setBusy(btn, false); });
  });


  /* nav links: always return to the main page, then scroll to the section */
  document.querySelectorAll('.jump').forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      var id = link.getAttribute('href').slice(1);
      var t = document.getElementById(id);
      if(t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
  document.getElementById('toTop').addEventListener('click', function(){ window.scrollTo({ top: 0, behavior: 'smooth' }); });

  document.querySelectorAll('.main-nav a:not([data-goto])').forEach(function(link){
    link.addEventListener('click', function(e){
      e.preventDefault();
      var id = link.getAttribute('href').slice(1);
      showView('guest');
      requestAnimationFrame(function(){
        var t = document.getElementById(id);
        if(id === 'top' || !t){ window.scrollTo({ top: 0 }); }
        else { t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      });
    });
  });

  /* ---------- services, bundles, orders ---------- */
  var PESO = '\u20B1';
  var SERVICES = {
    residential: { name:'Residential Solar', desc:'Custom rooftop solar for your home: site survey, design, permits, installation, and monitoring.',
      bundles:[
        { id:'res-3', name:'Starter 3 kW', price:180000, info:'6 panels, hybrid-ready inverter. Good for small homes.' },
        { id:'res-5', name:'Family 5 kW', price:295000, info:'10 panels, inverter, monitoring app. Covers a typical family home.' },
        { id:'res-8', name:'Home Plus 8 kW + Battery', price:520000, info:'16 panels, inverter, battery backup for outages.' } ] },
    commercial: { name:'Commercial Solar', desc:'Systems for shops, offices, and warehouses to cut operating costs and increase efficiency.',
      bundles:[
        { id:'com-15', name:'Shop 15 kW', price:720000, info:'Small storefronts and clinics.' },
        { id:'com-30', name:'Business 30 kW', price:1350000, info:'Offices and restaurants with daytime load.' },
        { id:'com-60', name:'Enterprise 60 kW', price:2500000, info:'Warehouses and factories. Includes energy report.' } ] },
    maintenance: { name:'Maintenance & Repair', desc:'Scheduled cleaning, servicing, inspections, and fast repairs for any solar system.',
      bundles:[
        { id:'mnt-clean', name:'Panel Cleaning Visit', price:3500, info:'One-time cleaning and visual check.' },
        { id:'mnt-annual', name:'Annual Service Plan', price:12000, info:'2 cleanings, 1 full inspection, priority support.' },
        { id:'mnt-repair', name:'Repair & Diagnostics', price:6500, info:'On-site fault finding. Parts quoted separately.' } ] }
  };
  function money(n){ return PESO + Number(n).toLocaleString('en-PH'); }
  function el(tag, cls, text){ var e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; }

  var svcModal = document.getElementById('svcModal');
  var modalService = null;
  function openService(key){
    var s = SERVICES[key]; if(!s) return;
    modalService = key;
    document.getElementById('svcTitle').textContent = s.name;
    document.getElementById('svcDesc').textContent = s.desc;
    var list = document.getElementById('svcBundles'); list.textContent = '';
    s.bundles.forEach(function(b){
      var row = el('div', 'bundle');
      var left = el('div'); left.appendChild(el('b', null, b.name)); left.appendChild(el('span', null, b.info));
      row.appendChild(left); row.appendChild(el('strong', null, money(b.price)));
      list.appendChild(row);
    });
    svcModal.classList.remove('hidden');
    document.body.classList.add('modal-open');
    document.getElementById('svcClose').focus();
  }
  function closeService(){ svcModal.classList.add('hidden'); document.body.classList.remove('modal-open'); }
  document.querySelectorAll('.service-card[data-service]').forEach(function(c){
    c.addEventListener('click', function(){ openService(c.getAttribute('data-service')); });
    c.addEventListener('keydown', function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openService(c.getAttribute('data-service')); } });
  });
  document.getElementById('svcClose').addEventListener('click', closeService);
  svcModal.addEventListener('click', function(e){ if(e.target === svcModal) closeService(); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeService(); });
  document.getElementById('svcOrder').addEventListener('click', function(){
    var key = modalService; closeService();
    if(!currentUser){ showView('login'); return; }
    showView('account');
    document.getElementById('ordService').value = key; fillBundles();
  });

  var ordService = document.getElementById('ordService');
  var ordBundle = document.getElementById('ordBundle');
  Object.keys(SERVICES).forEach(function(k){
    var o = document.createElement('option'); o.value = k; o.textContent = SERVICES[k].name; ordService.appendChild(o);
  });
  function fillBundles(){
    ordBundle.textContent = '';
    SERVICES[ordService.value].bundles.forEach(function(b){
      var o = document.createElement('option'); o.value = b.id; o.textContent = b.name + ' \u2014 ' + money(b.price); ordBundle.appendChild(o);
    });
    updateTotal();
  }
  function findBundle(){
    return SERVICES[ordService.value].bundles.filter(function(b){ return b.id === ordBundle.value; })[0];
  }
  function updateTotal(){ var b = findBundle(); document.getElementById('ordTotal').textContent = money(b ? b.price : 0); }
  ordService.addEventListener('change', fillBundles);
  ordBundle.addEventListener('change', updateTotal);
  fillBundles();

  function ordersKey(){
    return 'sunson_orders_' + (currentUser.id || currentUser.username || currentUser.email || currentUser.firstName);
  }
  function loadOrders(){
    try { return JSON.parse(localStorage.getItem(ordersKey())) || []; } catch(e){ return []; }
  }
  function saveOrders(list){
    try { localStorage.setItem(ordersKey(), JSON.stringify(list)); return true; } catch(e){ return false; }
  }
  function renderOrders(){
    var box = document.getElementById('orderList'); box.textContent = '';
    var list = loadOrders();
    if(!list.length){ box.appendChild(el('p', 'empty', 'No orders yet. Your placed orders will show up here.')); return; }
    list.slice().reverse().forEach(function(o){
      var card = el('div', 'order');
      var top = el('div', 'order-top');
      top.appendChild(el('b', null, o.bundle)); top.appendChild(el('span', 'status', o.status));
      card.appendChild(top);
      card.appendChild(el('div', 'order-meta', o.service + ' \u00B7 ' + money(o.price)));
      card.appendChild(el('div', 'order-meta', 'Order #' + o.id + ' \u00B7 placed ' + new Date(o.placedAt).toLocaleDateString('en-PH')));
      card.appendChild(el('div', 'order-meta', 'Preferred date: ' + o.date + ' \u00B7 ' + o.address));
      if(o.notes) card.appendChild(el('div', 'order-meta', 'Notes: ' + o.notes));
      box.appendChild(card);
    });
  }
  function renderAccount(){
    document.getElementById('acctHello').textContent = 'Hi, ' + (currentUser.firstName || 'there') + '.';
    var addr = document.getElementById('ordAddress');
    if(!addr.value && currentUser.address) addr.value = currentUser.address;
    var d = document.getElementById('ordDate');
    d.min = new Date().toISOString().slice(0, 10);
    renderOrders();
  }
  document.getElementById('orderForm').addEventListener('submit', function(e){
    e.preventDefault();
    var addr = document.getElementById('ordAddress').value.trim();
    var date = document.getElementById('ordDate').value;
    setError('f-ord-address', addr ? '' : 'Enter the address.');
    setError('f-ord-date', date ? '' : 'Pick a preferred date.');
    if(!addr || !date) return;
    var b = findBundle(); var list = loadOrders();
    list.push({
      id: String(Date.now()).slice(-8), service: SERVICES[ordService.value].name, bundle: b.name, price: b.price,
      address: addr, date: date, notes: document.getElementById('ordNotes').value.trim(),
      status: 'Pending', placedAt: new Date().toISOString()
    });
    if(!saveOrders(list)){ setError('f-ord-date', 'Could not save the order in this browser.'); return; }
    document.getElementById('ordNotes').value = ''; document.getElementById('ordDate').value = '';
    renderOrders();
  });


  /* projects: scroll-driven horizontal parallax gallery */
  (function(){
    var pin = document.getElementById('projectsPin'), sticky = document.getElementById('projectsSticky'), track = document.getElementById('projectsTrack');
    if(!pin || !sticky || !track) return;
    var cards = Array.prototype.slice.call(track.querySelectorAll('.p-card'));
    var still = window.matchMedia('(prefers-reduced-motion: reduce)');
    var dist = 0, ticking = false;
    function layout(){
      if(still.matches || !pin.offsetParent){ pin.style.height = ''; track.style.transform = ''; cards.forEach(function(c){ c.style.transform = ''; }); return; }
      dist = Math.max(0, track.offsetWidth - sticky.clientWidth);
      pin.style.height = (sticky.offsetHeight + dist) + 'px';
      update();
    }
    function update(){
      ticking = false;
      if(still.matches || !pin.offsetParent) return;
      var top = parseFloat(getComputedStyle(sticky).top) || 0;
      var range = pin.offsetHeight - sticky.offsetHeight;
      var p = range > 0 ? Math.min(1, Math.max(0, (top - pin.getBoundingClientRect().top) / range)) : 0;
      track.style.transform = 'translate3d(' + (-p * dist) + 'px,0,0)';
      cards.forEach(function(c){
        var dx = (p - 0.5) * parseFloat(c.dataset.d) * 140;
        c.style.transform = 'translate3d(' + dx + 'px,' + c.dataset.y + ',0) scale(' + c.dataset.s + ')';
      });
    }
    window.__layoutProjects = layout;
    window.addEventListener('scroll', function(){ if(!ticking){ ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', layout);
    window.addEventListener('load', layout);
    if(still.addEventListener) still.addEventListener('change', layout);
    layout();
  })();

    document.getElementById('year').textContent = new Date().getFullYear();
  showView('guest');

  api('/api/me', 'GET').then(function(d){ if(d.ok) setUser(d); }).catch(function(){});

})();
