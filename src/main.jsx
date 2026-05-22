import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Pre-seed the Google Client ID detected from the credentials JSON file
// This ensures the setup screen is skipped if not already configured
const GOOGLE_CLIENT_ID = '296083258065-hpr8iup9otebv5m1dd3fbrn0g3elpmug.apps.googleusercontent.com';
if (!localStorage.getItem('pasta_nova_google_client_id')) {
  localStorage.setItem('pasta_nova_google_client_id', GOOGLE_CLIENT_ID);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
