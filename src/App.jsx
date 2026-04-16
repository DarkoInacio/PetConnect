import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProvidersMapPage } from './pages/ProvidersMapPage';
import { ProviderProfilePage } from './pages/ProviderProfilePage';
import './App.css';

function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path='/' element={<ProvidersMapPage />} />
				<Route path='/proveedores/:id' element={<ProviderProfilePage />} />
			</Routes>
		</BrowserRouter>
	);
}

export default App;
