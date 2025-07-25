document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();

    const loginCard = document.getElementById('login-card');
    const registerCard = document.getElementById('register-card');
    const createAccountLink = document.getElementById('create-account-link');
    const loginLink = document.getElementById('login-link');
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('login-password');

    // Alternar para o card de cadastro
    createAccountLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginCard.classList.add('hidden');
        registerCard.classList.remove('hidden');
    });

    // Alternar para o card de login
    loginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerCard.classList.add('hidden');
        loginCard.classList.remove('hidden');
    });

    // Mostrar/ocultar senha
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.classList.toggle('fa-eye');
        togglePassword.classList.toggle('fa-eye-slash');
    });

    // --- Lógica de Autenticação com Firebase ---

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    // Login
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = loginForm['login-email'].value;
        const password = loginForm['login-password'].value;

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('Usuário logado:', userCredential.user);
                alert('Login realizado com sucesso!');
                // Redirecionar para a página principal do app
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                console.error('Erro no login:', error);
                alert(`Erro: ${error.message}`);
            });
    });

    // Cadastro
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = registerForm['register-name'].value;
        const email = registerForm['register-email'].value;
        const password = registerForm['register-password'].value;

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log('Usuário cadastrado:', userCredential.user);
                alert('Cadastro realizado com sucesso! Faça o login.');
                // Opcional: logar o usuário automaticamente ou pedir para ele fazer login
                registerCard.classList.add('hidden');
                loginCard.classList.remove('hidden');
                loginForm.reset();
                registerForm.reset();
            })
            .catch((error) => {
                console.error('Erro no cadastro:', error);
                alert(`Erro: ${error.message}`);
            });
    });

    // Observador de estado de autenticação
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log('Usuário está logado:', user);
            // Se o usuário já estiver logado, redirecione para o dashboard
            if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
                window.location.href = 'dashboard.html';
            }
        } else {
            console.log('Nenhum usuário logado.');
        }
    });
});
