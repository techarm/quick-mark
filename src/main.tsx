import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SearchWindow } from './SearchWindow';
import './styles/global.css';

// パスベースでルーティング（/search → 検索ウィンドウ、それ以外 → メインアプリ）
const isSearchWindow = window.location.pathname === '/search';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>{isSearchWindow ? <SearchWindow /> : <App />}</React.StrictMode>,
);
