import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppLayoutHeader } from './components/AppLayoutHeader';
import { AdminProvidersPage } from './pages/AdminProvidersPage';
import { AdminReviewReportsPage } from './pages/AdminReviewReportsPage';
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
import { ProviderReviewsPage } from './pages/ProviderReviewsPage';
import { ProvidersExplorePage } from './pages/ProvidersExplorePage';
import { ProvidersMapPage } from './pages/ProvidersMapPage';
import { RegisterOwnerPage } from './pages/RegisterOwnerPage';
import { RegisterProviderPage } from './pages/RegisterProviderPage';
import { RequestServicePage } from './pages/RequestServicePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VetClinicalPage } from './pages/VetClinicalPage';
import './App.css';

function App() {
	return (
		<BrowserRouter>
			<AppLayoutHeader />
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
				<Route path='/admin/resenas-reportes' element={<AdminReviewReportsPage />} />
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
