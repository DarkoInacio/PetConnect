import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AdminProvidersPage } from './pages/AdminProvidersPage';
import { BookAppointmentPage } from './pages/BookAppointmentPage';
import { CitasLegacyPage } from './pages/CitasLegacyPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { MyPetsPage } from './pages/MyPetsPage';
import { OwnerProfilePage } from './pages/OwnerProfilePage';
import { PetDetailPage } from './pages/PetDetailPage';
import { PetEncounterDetailPage } from './pages/PetEncounterDetailPage';
import { PetFormPage } from './pages/PetFormPage';
import { PetMedicalPage } from './pages/PetMedicalPage';
import { ProviderDashboardPage } from './pages/ProviderDashboardPage';
import { ProviderMiPerfilPage } from './pages/ProviderMiPerfilPage';
import { ProviderProfilePage } from './pages/ProviderProfilePage';
import { ProvidersExplorePage } from './pages/ProvidersExplorePage';
import { ProvidersMapPage } from './pages/ProvidersMapPage';
import { RegisterOwnerPage } from './pages/RegisterOwnerPage';
import { RegisterProviderPage } from './pages/RegisterProviderPage';
import { RequestServicePage } from './pages/RequestServicePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VetClinicalPage } from './pages/VetClinicalPage';
import './App.css';

function AppHeader() {
	const { user, loading, logout } = useAuth();
	return (
		<header className='app-header'>
			<nav className='app-nav'>
				<Link to='/'>Mapa</Link>
				<Link to='/explorar'>Explorar</Link>
				{!loading && !user ? (
					<>
						<Link to='/login'>Iniciar sesión</Link>
						<Link to='/registro'>Registro dueño</Link>
						<Link to='/registro-proveedor'>Registro proveedor</Link>
					</>
				) : null}
				{!loading && user ? (
					<>
						<span className='nav-user'>
							{user.name} · {user.role}
						</span>
						{user.role === 'proveedor' ? <Link to='/proveedor'>Panel proveedor</Link> : null}
						{user.role === 'proveedor' ? (
							<Link to='/proveedor/mi-perfil'>Editar perfil</Link>
						) : null}
						{user.role === 'dueno' ? <Link to='/mis-reservas'>Mis reservas</Link> : null}
						{user.role === 'dueno' ? <Link to='/mascotas'>Mascotas</Link> : null}
						{user.role === 'dueno' ? <Link to='/mi-perfil'>Mi perfil</Link> : null}
						{user.role === 'admin' ? <Link to='/admin/proveedores'>Admin proveedores</Link> : null}
						<button type='button' className='nav-logout' onClick={logout}>
							Salir
						</button>
					</>
				) : null}
			</nav>
		</header>
	);
}

function App() {
	return (
		<BrowserRouter>
			<AppHeader />
			<Routes>
				<Route path='/' element={<ProvidersMapPage />} />
				<Route path='/explorar' element={<ProvidersExplorePage />} />
				<Route path='/login' element={<LoginPage />} />
				<Route path='/registro' element={<RegisterOwnerPage />} />
				<Route path='/registro-proveedor' element={<RegisterProviderPage />} />
				<Route path='/recuperar-clave' element={<ForgotPasswordPage />} />
				<Route path='/reset-password' element={<ResetPasswordPage />} />
				<Route path='/proveedor' element={<ProviderDashboardPage />} />
				<Route path='/proveedor/mi-perfil' element={<ProviderMiPerfilPage />} />
				<Route path='/mis-reservas' element={<MyBookingsPage />} />
				<Route path='/citas' element={<CitasLegacyPage />} />
				<Route path='/mi-perfil' element={<OwnerProfilePage />} />
				<Route path='/mascotas/nueva' element={<PetFormPage />} />
				<Route path='/mascotas/:petId/edit' element={<PetFormPage />} />
				<Route path='/mascotas/:petId/ficha' element={<PetMedicalPage />} />
				<Route path='/mascotas/:petId/atencion/:encounterId' element={<PetEncounterDetailPage />} />
				<Route path='/mascotas/:petId' element={<PetDetailPage />} />
				<Route path='/mascotas' element={<MyPetsPage />} />
				<Route path='/admin/proveedores' element={<AdminProvidersPage />} />
				<Route path='/proveedor/atencion-clinica' element={<VetClinicalPage />} />
				<Route path='/agendar' element={<BookAppointmentPage />} />
				<Route path='/solicitar-servicio' element={<RequestServicePage />} />
				<Route path='/proveedores/perfil/:tipo/:slug' element={<ProviderProfilePage />} />
				<Route path='/proveedores/:id' element={<ProviderProfilePage />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
