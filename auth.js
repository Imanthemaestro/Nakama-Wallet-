/* ============================================================
   auth.js — Authentication Logic (Updated)
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Guard: Redirect to home if already logged in
  if (localStorage.getItem('wn_current_user')) {
    window.location.href = 'home.html';
  }

  // 2. Tab Switching
  document.querySelectorAll('.auth-tab').forEach(btn => {
    btn.addEventListener('click', () => switchAuthTab(btn.dataset.tab));
  });

  document.querySelectorAll('[data-switch]').forEach(link => {
    link.addEventListener('click', e => { e.preventDefault(); switchAuthTab(link.dataset.switch); });
  });

  // 3. Sign In Submit
  document.getElementById('signin-form').addEventListener('submit', function(e) {
    e.preventDefault();
    clearErrors(['signin-email-err', 'signin-pw-err']);
    clearMsg('signin-msg');

    // USING GET-ELEMENT-BY-ID FOR BULLETPROOF READING
    const email    = document.getElementById('signin-email').value.trim();
    const password = document.getElementById('signin-password').value;
    let valid = true;

    if (!email) { setError('signin-email-err', 'Email is required'); valid = false; }
    else if (!isValidEmail(email)) { setError('signin-email-err', 'Enter a valid email'); valid = false; }
    if (!password) { setError('signin-pw-err', 'Password is required'); valid = false; }

    if (!valid) return;

    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === hashish(password));

    if (!user) {
      setMsg('signin-msg', 'Invalid email or password.', 'error');
      return;
    }

    loginUser(user);
  });

  // 4. Sign Up Submit
  document.getElementById('signup-form').addEventListener('submit', function(e) {
    e.preventDefault();
    clearErrors(['signup-first-err','signup-last-err','signup-email-err','signup-pw-err','signup-confirm-err']);
    clearMsg('signup-msg');

    // USING GET-ELEMENT-BY-ID FOR BULLETPROOF READING
    const first    = document.getElementById('signup-first').value.trim();
    const last     = document.getElementById('signup-last').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm  = document.getElementById('signup-confirm').value;
    let valid = true;

    if (!first) { setError('signup-first-err', 'First name required'); valid = false; }
    if (!last)  { setError('signup-last-err', 'Last name required'); valid = false; }
    if (!email) { setError('signup-email-err', 'Email required'); valid = false; }
    else if (!isValidEmail(email)) { setError('signup-email-err', 'Enter a valid email'); valid = false; }
    if (!password) { setError('signup-pw-err', 'Password required'); valid = false; }
    else if (password.length < 6) { setError('signup-pw-err', 'Password must be at least 6 characters'); valid = false; }
    if (password !== confirm) { setError('signup-confirm-err', 'Passwords do not match'); valid = false; }

    if (!valid) return;

    const users = getUsers();
    if (users.find(u => u.email === email)) {
      setError('signup-email-err', 'An account with this email already exists.');
      return;
    }

    const newUser = { email, firstName: first, lastName: last, password: hashish(password) };
    users.push(newUser);
    saveUsers(users);
    setMsg('signup-msg', 'Account created! Signing you in…', 'success');
    
    setTimeout(() => {
      loginUser(newUser);
    }, 800);
  });
});

// 5. Shared Functions
function loginUser(user) {
  localStorage.setItem('wn_current_user', user.email);
  window.location.href = 'home.html';
}

function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.auth-form').forEach(f => f.classList.toggle('active', f.id === `${tab}-form`));
}