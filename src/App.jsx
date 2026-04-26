import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayoutHeader } from './components/AppLayoutHeader';
import { OwnerLayout } from './components/OwnerLayout';
import { AdminProvidersPage } from './pages/AdminProvidersPage';
import { AdminReviewReportsPage } from './pages/AdminReviewReportsPage';
import { BookAppointmentPage } from './pages/BookAppointmentPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { LoginPage } from './pages/LoginPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import { MyPetsPage } from './pages/MyPetsPage';
import { OfferProviderServicesPage } from './pages/OfferProviderServicesPage';
import { OwnerProfilePage } from './pages/OwnerProfilePage';
import { PetDetailPage } from './pages/PetDetailPage';
import { PetEncounterDetailPage } from './pages/PetEncounterDetailPage';
import { PetFormPage } from './pages/PetFormPage';
import { PetMedicalPage } from './pages/PetMedicalPage';
import { ProviderDashboardPage } from './pages/ProviderDashboardPage';
import { ProviderMiPerfilPage } from './pages/ProviderMiPerfilPage';
import { ProviderProfilePage } from './pages/ProviderProfilePage';
import { ProviderReviewsPage } from './pages/ProviderReviewsPage';
import { ProvidersExplorePage } from './pages/ProvidersExplorePage';
import { ProvidersMapPage } from './pages/ProvidersMapPage';
import { RegisterOwnerPage } from './pages/RegisterOwnerPage';
import { RegisterProviderPage } from './pages/RegisterProviderPage';
import { RequestServicePage } from './pages/RequestServicePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VetClinicalPage } from './pages/VetClinicalPage';
import { ChatWidget } from './components/ChatWidget';

// App.css eliminado — todos los estilos migrados a Tailwind v4

function App() {
	return (
		<BrowserRouter>
			<a className="skip-to-main" href="#contenido-principal">
				Saltar al contenido
			</a>
			<AppLayoutHeader />
			<main
				id="contenido-principal"
				className="flex min-h-0 flex-1 flex-col w-full"
				tabIndex={-1}
			>
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
				<Route path='/proveedor/mis-resenas' element={<ProviderReviewsPage />} />

				<Route path='/cuenta' element={<OwnerLayout />}>
					<Route index element={<Navigate to="reservas" replace />} />
					<Route path='reservas' element={<MyBookingsPage />} />
					<Route path='perfil' element={<OwnerProfilePage />} />
					<Route path='ofrecer-servicios' element={<OfferProviderServicesPage />} />
					<Route path='mascotas' element={<MyPetsPage />} />
				</Route>
				<Route path='/mis-reservas' element={<Navigate to="/cuenta/reservas" replace />} />
				<Route path='/mi-perfil/ofrecer-servicios' element={<Navigate to="/cuenta/ofrecer-servicios" replace />} />
				<Route path='/mi-perfil' element={<Navigate to="/cuenta/perfil" replace />} />

				<Route path='/mascotas/nueva' element={<PetFormPage />} />
				<Route path='/mascotas/:petId/edit' element={<PetFormPage />} />
				<Route path='/mascotas/:petId/ficha' element={<PetMedicalPage />} />
				<Route path='/mascotas/:petId/atencion/:encounterId' element={<PetEncounterDetailPage />} />
				<Route path='/mascotas/:petId' element={<PetDetailPage />} />
				<Route path='/mascotas' element={<Navigate to="/cuenta/mascotas" replace />} />
				<Route path='/admin/proveedores' element={<AdminProvidersPage />} />
				<Route path='/admin/resenas-reportes' element={<AdminReviewReportsPage />} />
				<Route path='/proveedor/atencion-clinica' element={<VetClinicalPage />} />
				<Route path='/agendar' element={<BookAppointmentPage />} />
				<Route path='/solicitar-servicio' element={<RequestServicePage />} />
				<Route path='/proveedores/perfil/:tipo/:slug' element={<ProviderProfilePage />} />
				<Route path='/proveedores/:id' element={<ProviderProfilePage />} />
			</Routes>
			</main>
			<ChatWidget />
		</BrowserRouter>
	);
}

export default App;
