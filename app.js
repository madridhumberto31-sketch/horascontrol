// Firebase imports
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    orderBy, 
    where,
    deleteDoc
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDQA1OcmqlJD1mDd5WtxINTBTOgQl4Wivo",
    authDomain: "horas-control.firebaseapp.com",
    projectId: "horas-control",
    storageBucket: "horas-control.firebasestorage.app",
    messagingSenderId: "1035784080509",
    appId: "1:1035784080509:web:a918e7bb3fdb1f4e187514"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Constants
const ADMIN_EMAILS = [
    'humbertoantoniomadridflores4@gmail.com',
    'carlos.alexander.mezquita@clases.edu.sv'
];

// Limits
const MAX_CLASSES = 400;

const DEFAULT_AVATAR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiM2NjdlZWEiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTggMzJjMC02LjYyNyA1LjM3My0xMiAxMi0xMnMxMiA1LjM3MyAxMiAxMiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+';

// Global variables
let currentUser = null;
let userProfile = null;
let isAdmin = false;
let hoursData = [];

// Utility functions
function showPage(pageId) {
    const pages = ['login-page', 'setup-page', 'dashboard'];
    pages.forEach(id => {
        const page = document.getElementById(id);
        if (page) {
            page.classList.toggle('hidden', id !== pageId);
        }
    });
    
    // Hide loading
    const loading = document.getElementById('loading-screen');
    if (loading) loading.classList.add('hidden');
}

function formatDate(date) {
    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

// Auth functions
async function handleGoogleLogin() {
    const btn = document.getElementById('google-signin');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Conectando...';
    btn.disabled = true;
    
    try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Error login:', error);
        alert('Error al iniciar sesión. Intenta de nuevo.');
        
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function handleUserAuthenticated(user) {
    currentUser = user;
    isAdmin = ADMIN_EMAILS.includes(user.email);
    
    if (isAdmin) {
        // Administradores van directo al dashboard sin setup
        console.log('Usuario administrador, saltando setup');
        userProfile = {
            name: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email,
            isAdmin: true
        };
        showDashboard();
        return;
    }
    
    try {
        // Solo profesores necesitan verificar perfil
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
            userProfile = userDoc.data();
            showDashboard();
        } else {
            showPage('setup-page');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showPage('setup-page');
    }
}

async function handleSetup(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('.submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    btn.disabled = true;
    
    try {
        const grade = document.getElementById('grade').value;
        const section = document.getElementById('section').value;
        
        const classSubjects = [];
        if (document.getElementById('matematica-clase').checked) classSubjects.push('matematica');
        if (document.getElementById('lenguaje-clase').checked) classSubjects.push('lenguaje');
        
        const reinforcementSubjects = [];
        if (document.getElementById('matematica-refuerzo').checked) reinforcementSubjects.push('matematica');
        if (document.getElementById('lenguaje-refuerzo').checked) reinforcementSubjects.push('lenguaje');
        
        if (!grade || !section) {
            throw new Error('Complete todos los campos obligatorios');
        }
        
        if (classSubjects.length === 0 && reinforcementSubjects.length === 0) {
            throw new Error('Seleccione al menos una materia');
        }
        
        userProfile = {
            name: currentUser.displayName || currentUser.email.split('@')[0],
            email: currentUser.email,
            grade: grade,
            section: section,
            classSubjects: classSubjects,
            reinforcementSubjects: reinforcementSubjects,
            isAdmin: isAdmin,
            createdAt: new Date()
        };
        
        await setDoc(doc(db, 'users', currentUser.uid), userProfile);
        
        btn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
        
        setTimeout(() => {
            showDashboard();
        }, 1500);
        
    } catch (error) {
        console.error('Error saving profile:', error);
        alert('Error: ' + error.message);
        
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function showDashboard() {
    showPage('dashboard');
    
    // Update user info
    const userName = document.getElementById('user-name');
    const userPhoto = document.getElementById('user-photo');
    
    if (userName) userName.textContent = userProfile?.name || currentUser.displayName || currentUser.email.split('@')[0];
    if (userPhoto) userPhoto.src = currentUser.photoURL || DEFAULT_AVATAR;
    
    // Show/hide sections based on user type
    const teacherSection = document.getElementById('teacher-section');
    const tableTitle = document.getElementById('table-title');
    
    if (isAdmin) {
        // Administradores: Solo tabla de todos los registros
        if (teacherSection) teacherSection.style.display = 'none';
        if (tableTitle) {
            tableTitle.innerHTML = '👑 Panel Administrador - Registros de Todos los Profesores';
            tableTitle.style.color = '#dc2626'; // Color rojo para destacar
        }
        console.log('Cargando datos de administrador...');
        loadAllData();
    } else {
        // Profesores: Formulario + tabla personal
        if (teacherSection) teacherSection.style.display = 'block';
        if (tableTitle) {
            tableTitle.textContent = '📝 Mis Registros';
            tableTitle.style.color = ''; // Color normal
        }
        updateFormFields();
        loadUserData();
    }
}

function setStatus(userText = '', roleText = '', msg = '') {
    const su = document.getElementById('status-user');
    const sr = document.getElementById('status-role');
    const sm = document.getElementById('status-msg');
    if (su) su.textContent = userText;
    if (sr) sr.textContent = roleText ? `Rol: ${roleText}` : '';
    if (sm) sm.textContent = msg;
}

function updateFormFields() {
    if (!userProfile) return;
    
    // Show/hide form fields based on user subjects
    const fields = [
        { selector: '.math-class-field', subjects: userProfile.classSubjects, subject: 'matematica' },
        { selector: '.language-class-field', subjects: userProfile.classSubjects, subject: 'lenguaje' },
        { selector: '.math-reinforcement-field', subjects: userProfile.reinforcementSubjects, subject: 'matematica' },
        { selector: '.language-reinforcement-field', subjects: userProfile.reinforcementSubjects, subject: 'lenguaje' }
    ];
    
    fields.forEach(({ selector, subjects, subject }) => {
        const element = document.querySelector(selector);
        if (element) {
            element.style.display = (subjects && subjects.includes(subject)) ? 'block' : 'none';
        }
    });
}

async function handleHoursSubmit(e) {
    e.preventDefault();
    
    const btn = e.target.querySelector('.add-classes-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
    btn.disabled = true;
    
    try {
        const date = document.getElementById('date-input').value;
        const mathClasses = Math.max(0, Math.floor(parseInt(document.getElementById('math-classes')?.value) || 0));
        const languageClasses = Math.max(0, Math.floor(parseInt(document.getElementById('language-classes')?.value) || 0));
        const mathReinforcement = Math.max(0, Math.floor(parseInt(document.getElementById('math-reinforcement')?.value) || 0));
        const languageReinforcement = Math.max(0, Math.floor(parseInt(document.getElementById('language-reinforcement')?.value) || 0));
        
        const total = mathClasses + languageClasses + mathReinforcement + languageReinforcement;
        
        if (!date) throw new Error('Seleccione una fecha');
        if (total === 0) throw new Error('Ingrese al menos un valor');

        // Validate against maximum allowed classes
        const fields = [
            { name: 'Clases de Matemática', value: mathClasses },
            { name: 'Clases de Lenguaje', value: languageClasses },
            { name: 'Refuerzos de Matemática', value: mathReinforcement },
            { name: 'Refuerzos de Lenguaje', value: languageReinforcement }
        ];

        for (const f of fields) {
            if (!Number.isInteger(f.value) || f.value < 0) {
                throw new Error(`${f.name} debe ser un número entero válido mayor o igual a 0`);
            }
            if (f.value > MAX_CLASSES) {
                throw new Error(`${f.name} no puede ser mayor a ${MAX_CLASSES}`);
            }
        }
        
        const entry = {
            userId: currentUser.uid,
            professorName: userProfile.name,
            grade: userProfile.grade,
            section: userProfile.section,
            date: date,
            mathClasses: mathClasses,
            languageClasses: languageClasses,
            mathReinforcement: mathReinforcement,
            languageReinforcement: languageReinforcement,
            total: total,
            createdAt: new Date()
        };
        
        await addDoc(collection(db, 'classes'), entry);
        
        // Reset form
        document.getElementById('hours-form').reset();
        document.getElementById('date-input').value = new Date().toISOString().split('T')[0];
        
        btn.innerHTML = '<i class="fas fa-check"></i> ¡Guardado!';
        
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
            loadUserData();
        }, 2000);
        
    } catch (error) {
        console.error('Error saving hours:', error);
        alert('Error: ' + error.message);
        
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function loadAllData() {
    try {
        const q = query(collection(db, 'classes'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        
        hoursData = [];
        snapshot.forEach(doc => {
            hoursData.push({ id: doc.id, ...doc.data() });
        });
        
        updateTable();
        setStatus(undefined, undefined, `Registros totales: ${hoursData.length}`);
    } catch (error) {
        console.error('Error loading all data:', error);
        setStatus(undefined, undefined, 'Error cargando registros: ' + error.message);
    }
}

async function loadUserData() {
    try {
        const q = query(
            collection(db, 'classes'), 
            where('userId', '==', currentUser.uid),
            orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        
        hoursData = [];
        snapshot.forEach(doc => {
            hoursData.push({ id: doc.id, ...doc.data() });
        });
        
        updateTable();
        setStatus(undefined, undefined, `Mis registros: ${hoursData.length}`);
    } catch (error) {
        console.error('Error loading user data:', error);
        setStatus(undefined, undefined, 'Error cargando mis registros: ' + error.message);
    }
}

function updateTable() {
    const tbody = document.getElementById('hours-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (hoursData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: #666;">No hay registros</td></tr>';
        return;
    }
    
    hoursData.forEach(entry => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(new Date(entry.date))}</td>
            <td>${entry.professorName}</td>
            <td>${entry.grade}</td>
            <td>${entry.section}</td>
            <td>${entry.mathClasses || 0}</td>
            <td>${entry.languageClasses || 0}</td>
            <td>${entry.mathReinforcement || 0}</td>
            <td>${entry.languageReinforcement || 0}</td>
            <td><strong>${entry.total}</strong></td>
            <td>
                ${!isAdmin ? `<button onclick="deleteEntry('${entry.id}')" class="delete-btn">
                    <i class="fas fa-trash"></i>
                </button>` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });

    // If current user is admin, also render admin summary
    if (isAdmin) renderAdminSummary();
}

function renderAdminSummary() {
    // aggregate hoursData by userId
    const map = new Map();
    hoursData.forEach(e => {
        const id = e.userId || 'unknown';
        if (!map.has(id)) {
            map.set(id, {
                userId: id,
                professorName: e.professorName || '',
                email: e.email || '',
                grade: e.grade || '',
                section: e.section || '',
                mathClasses: 0,
                languageClasses: 0,
                mathReinforcement: 0,
                languageReinforcement: 0,
                total: 0,
                entries: 0
            });
        }
        const agg = map.get(id);
        agg.mathClasses += Number(e.mathClasses || 0);
        agg.languageClasses += Number(e.languageClasses || 0);
        agg.mathReinforcement += Number(e.mathReinforcement || 0);
        agg.languageReinforcement += Number(e.languageReinforcement || 0);
        agg.total += Number(e.total || 0);
        agg.entries += 1;
        // update grade/section if missing
        if (!agg.grade && e.grade) agg.grade = e.grade;
        if (!agg.section && e.section) agg.section = e.section;
    });

    const tbody = document.getElementById('admin-summary-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    for (const agg of map.values()) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${agg.professorName}</td>
            <td>${agg.email || ''}</td>
            <td>${agg.grade || ''}</td>
            <td>${agg.section || ''}</td>
            <td><strong>${agg.total}</strong></td>
            <td>${agg.mathClasses}</td>
            <td>${agg.languageClasses}</td>
            <td>${agg.mathReinforcement}</td>
            <td>${agg.languageReinforcement}</td>
            <td>${agg.entries}</td>
            <td><button class="view-btn" data-user="${agg.userId}">Ver</button></td>
        `;
        tbody.appendChild(tr);
    }

    // attach handlers for view buttons
    document.querySelectorAll('#admin-summary-body .view-btn').forEach(btn => {
        btn.addEventListener('click', (ev) => {
            const userId = ev.currentTarget.getAttribute('data-user');
            if (userId) loadDataForUser(userId);
        });
    });
}

async function loadDataForUser(userId) {
    try {
        const q = query(
            collection(db, 'classes'),
            where('userId', '==', userId),
            orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);

        hoursData = [];
        snapshot.forEach(doc => hoursData.push({ id: doc.id, ...doc.data() }));

        // update table title
        const tableTitle = document.getElementById('table-title');
        if (tableTitle) tableTitle.textContent = `Registros de usuario: ${userId}`;

        updateTable();
        setStatus(undefined, undefined, `Registros mostrados para: ${userId} (${hoursData.length})`);
    } catch (err) {
        console.error('Error loading data for user:', err);
        setStatus(undefined, undefined, 'Error cargando registros de usuario: ' + err.message);
    }
}

// Global functions
window.deleteEntry = async (id) => {
    if (confirm('¿Eliminar este registro?')) {
        try {
            await deleteDoc(doc(db, 'classes', id));
            loadUserData();
        } catch (error) {
            alert('Error al eliminar: ' + error.message);
        }
    }
};

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Set today's date
    const dateInput = document.getElementById('date-input');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }
    // Ensure numeric inputs have correct max and clamp on input to avoid browser validation popups
    const numericIds = ['math-classes', 'language-classes', 'math-reinforcement', 'language-reinforcement'];
    numericIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        // enforce max attribute in case cached HTML had different value
        el.max = String(MAX_CLASSES);
        el.addEventListener('input', () => {
            const v = parseInt(el.value);
            if (isNaN(v)) return;
            if (v > MAX_CLASSES) el.value = String(MAX_CLASSES);
            if (v < 0) el.value = '0';
            // clear any custom validity to avoid stale browser messages
            if (typeof el.setCustomValidity === 'function') el.setCustomValidity('');
        });
        // also clear validity on focus
        el.addEventListener('focus', () => {
            if (typeof el.setCustomValidity === 'function') el.setCustomValidity('');
        });
    });
    
    // Auth state observer
    onAuthStateChanged(auth, (user) => {
        if (user) {
            handleUserAuthenticated(user);
        } else {
            showPage('login-page');
        }
    });
    
    // Event listeners
    const googleBtn = document.getElementById('google-signin');
    if (googleBtn) {
        googleBtn.addEventListener('click', handleGoogleLogin);
    }
    
    const setupForm = document.getElementById('setup-form');
    if (setupForm) {
        setupForm.addEventListener('submit', handleSetup);
    }
    
    const hoursForm = document.getElementById('hours-form');
    if (hoursForm) {
        hoursForm.addEventListener('submit', handleHoursSubmit);
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => signOut(auth));
    }
});