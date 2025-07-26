document.addEventListener('DOMContentLoaded', () => {
    // Inicializa o Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    // --- Elementos da UI ---
    const userEmailSpan = document.getElementById('user-email');
    const logoutButton = document.getElementById('logout-button');
    const incomeFormContainer = document.getElementById('income-form-container');
    const expenseFormContainer = document.getElementById('expense-form-container');
    const addIncomeButton = document.querySelector('.btn-income');
    const addExpenseButton = document.querySelector('.btn-expense');
    const incomeForm = document.getElementById('income-form');
    const expenseForm = document.getElementById('expense-form');
    const cancelIncomeForm = incomeFormContainer.querySelector('.btn-cancel');
    const cancelExpenseForm = expenseFormContainer.querySelector('.btn-cancel');
    const incomeTableBody = document.getElementById('income-table-body');
    const expenseTableBody = document.getElementById('expense-table-body');
    const monthSelect = document.getElementById('month-select');
    const yearSelect = document.getElementById('year-select');

    let currentEditId = null; // Rastreia o ID da transação em edição
    let balanceChart = null; // Rastreia a instância do gráfico

    // --- Autenticação ---
    auth.onAuthStateChanged(user => {
        if (user) {
            userEmailSpan.textContent = user.email;
            populateDateFilters(); // Popula os filtros de data
            const selectedYear = yearSelect.value;
            const selectedMonth = monthSelect.value;
            loadTransactions(user.uid, selectedYear, selectedMonth);
        } else {
            window.location.href = 'index.html';
        }
    });

    logoutButton.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'index.html';
        }).catch(error => console.error('Erro ao fazer logout:', error));
    });

    // --- Funções dos Formulários ---
    const showForm = (formContainer) => formContainer.classList.remove('hidden');
    const hideForm = (formContainer) => formContainer.classList.add('hidden');

    addIncomeButton.addEventListener('click', () => {
        currentEditId = null;
        incomeForm.reset();
        document.querySelector('#income-form h3').textContent = 'Nova Receita';
        showForm(incomeFormContainer);
    });

    addExpenseButton.addEventListener('click', () => {
        currentEditId = null;
        expenseForm.reset();
        document.querySelector('#expense-form h3').textContent = 'Nova Despesa';
        showForm(expenseFormContainer);
    });

    cancelIncomeForm.addEventListener('click', () => hideForm(incomeFormContainer));
    cancelExpenseForm.addEventListener('click', () => hideForm(expenseFormContainer));

    // --- Lógica de Salvar/Atualizar (CRUD) ---
    const saveTransaction = (form, type) => {
        const description = form[`${type}-description`].value;
        const amount = parseFloat(form[`${type}-amount`].value);
        const date = form[`${type}-date`].value;
        const uid = auth.currentUser.uid;

        if (!description || !amount || !date || !uid) return;

        const data = { uid, type, description, amount, date };

        const promise = currentEditId
            ? db.collection('transactions').doc(currentEditId).update({ description, amount, date })
            : db.collection('transactions').add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });

        promise.then(() => {
            form.reset();
            hideForm(form.parentElement);
            currentEditId = null;
        }).catch(error => {
            console.error(`Erro ao salvar ${type}:`, error);
            alert(`Não foi possível salvar a ${type}.`);
        });
    };

    incomeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTransaction(e.target, 'income');
    });

    expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveTransaction(e.target, 'expense');
    });

    // --- Lógica de Filtro e Carregamento de Dados ---
    function populateDateFilters() {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();

        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = month;
            monthSelect.appendChild(option);
        });

        for (let year = currentYear + 1; year >= currentYear - 5; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        }

        monthSelect.value = currentMonth + 1;
        yearSelect.value = currentYear;
    }

    monthSelect.addEventListener('change', () => {
        const uid = auth.currentUser.uid;
        if (uid) loadTransactions(uid, yearSelect.value, monthSelect.value);
    });

    yearSelect.addEventListener('change', () => {
        const uid = auth.currentUser.uid;
        if (uid) loadTransactions(uid, yearSelect.value, monthSelect.value);
    });

    function loadTransactions(uid, year, month) {
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endDate = new Date(year, month, 0).getDate(); // Pega o último dia do mês
        const lastDayOfMonth = `${year}-${String(month).padStart(2, '0')}-${endDate}`;

        db.collection('transactions')
          .where('uid', '==', uid)
          .where('date', '>=', startDate)
          .where('date', '<=', lastDayOfMonth)
          .orderBy('date', 'desc')
          .onSnapshot(snapshot => {
            incomeTableBody.innerHTML = '';
            expenseTableBody.innerHTML = '';

            let incomeTotal = 0;
            let expenseTotal = 0;

            snapshot.forEach(doc => {
                const transaction = { id: doc.id, ...doc.data() };
                const tableBody = transaction.type === 'income' ? incomeTableBody : expenseTableBody;
                const row = tableBody.insertRow();
                row.dataset.id = transaction.id;

                if (transaction.type === 'income') {
                    incomeTotal += transaction.amount;
                } else {
                    expenseTotal += transaction.amount;
                }

                row.innerHTML = `
                    <td>${transaction.description}</td>
                    <td>${new Date(transaction.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                    <td class="transaction-amount ${transaction.type === 'income' ? 'income' : 'expense'}">R$ ${transaction.amount.toFixed(2).replace('.', ',')}</td>
                    <td class="action-buttons">
                        <button class="btn-action btn-edit"><i class="fa-solid fa-pencil"></i></button>
                        <button class="btn-action btn-delete"><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
            });

            document.getElementById('income-total').textContent = `R$ ${incomeTotal.toFixed(2).replace('.', ',')}`;
            document.getElementById('expense-total').textContent = `R$ ${expenseTotal.toFixed(2).replace('.', ',')}`;

            updateCurrentBalance(incomeTotal, expenseTotal);
            updateBalanceChart(incomeTotal, expenseTotal);
            addTableEventListeners();
        });
    }

    // --- Lógica do Saldo Atual ---
    function updateCurrentBalance(income, expense) {
        const balanceElement = document.getElementById('current-balance');
        if (!balanceElement) return;

        const balance = income - expense;
        balanceElement.textContent = `R$ ${balance.toFixed(2).replace('.', ',')}`;

        balanceElement.classList.remove('positive', 'negative');
        if (balance >= 0) {
            balanceElement.classList.add('positive');
        } else {
            balanceElement.classList.add('negative');
        }
    }

    // --- Lógica dos Botões de Ação da Tabela ---
    function updateBalanceChart(income, expense) {
        const ctx = document.getElementById('balance-chart').getContext('2d');
        
        if (balanceChart) {
            balanceChart.destroy(); // Destroi o gráfico anterior para evitar sobreposição
        }

        balanceChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Receitas', 'Despesas'],
                datasets: [{
                    label: 'Balanço do Mês',
                    data: [income, expense],
                    backgroundColor: [
                        'rgba(40, 167, 69, 0.7)', // Verde para receitas
                        'rgba(220, 53, 69, 0.7)'  // Vermelho para despesas
                    ],
                    borderColor: [
                        'rgba(40, 167, 69, 1)',
                        'rgba(220, 53, 69, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: false // Oculta a legenda, pois as cores já são claras
                    }
                }
            }
        });
    }

    function addTableEventListeners() {
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', handleDelete);
        });
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', handleEdit);
        });
    }

    function handleDelete(e) {
        const row = e.target.closest('tr');
        const docId = row.dataset.id;
        if (confirm('Tem certeza que deseja excluir esta transação?')) {
            db.collection('transactions').doc(docId).delete()
              .catch(error => console.error('Erro ao excluir:', error));
        }
    }

    function handleEdit(e) {
        const row = e.target.closest('tr');
        const docId = row.dataset.id;
        currentEditId = docId;

        db.collection('transactions').doc(docId).get().then(doc => {
            if (!doc.exists) return;

            const data = doc.data();
            if (data.type === 'income') {
                document.querySelector('#income-form h3').textContent = 'Editar Receita';
                incomeForm['income-description'].value = data.description;
                incomeForm['income-amount'].value = data.amount;
                incomeForm['income-date'].value = data.date;
                showForm(incomeFormContainer);
            } else {
                document.querySelector('#expense-form h3').textContent = 'Editar Despesa';
                expenseForm['expense-description'].value = data.description;
                expenseForm['expense-amount'].value = data.amount;
                expenseForm['expense-date'].value = data.date;
                showForm(expenseFormContainer);
            }
        });
    }

    // --- Lógica de Impressão e PDF ---
    const printBtn = document.getElementById('print-report-btn');
    const pdfBtn = document.getElementById('export-pdf-btn');
    const { jsPDF } = window.jspdf;

    printBtn.addEventListener('click', () => {
        window.print();
    });

    pdfBtn.addEventListener('click', () => {
        const reportContent = document.querySelector('main.container');

        html2canvas(reportContent, {
            scale: 2, // Melhora a resolução da imagem
            useCORS: true
        }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'pt',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const imgWidth = pdfWidth;
            const imgHeight = imgWidth / ratio;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save('relatorio-financeiro.pdf');
        });
    });
});
