import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { SearchWindow } from './SearchWindow';
import './styles/global.css';

// テーマをマウント前に適用（フラッシュ防止）
{
  const stored = localStorage.getItem('quickmark-theme');
  const theme =
    stored === 'light' || stored === 'dark'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  document.documentElement.dataset.theme = theme;
}

// URLパラメータまたはパスで検索ウィンドウを判別
const params = new URLSearchParams(window.location.search);
const isSearchWindow = params.get('window') === 'search' || window.location.pathname === '/search';

// 検索ウィンドウの場合は背景を透明に
if (isSearchWindow) {
  document.documentElement.classList.add('transparent-window');
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>{isSearchWindow ? <SearchWindow /> : <App />}</React.StrictMode>,
);
